import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName } = await req.json();
    if (!fileName) {
      return new Response(JSON.stringify({ error: "fileName requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("exam-results")
      .download(fileName);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "Impossible de télécharger le PDF: " + downloadError?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64 for AI analysis
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Use Lovable AI (Gemini) to extract dossier numbers and results
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const aiResponse = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyse ce document PDF de résultats d'examen. Extrais TOUS les numéros de dossier et leur résultat (admissible ou non admissible).

Réponds UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après. Le format doit être exactement:
[{"dossier": "00017322", "resultat": "admissible"}, {"dossier": "00017323", "resultat": "non admissible"}]

- "dossier" = le numéro de dossier (string, garder les zéros devant)
- "resultat" = "admissible" ou "non admissible" exactement

Ne mets aucune explication, juste le tableau JSON.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        temperature: 0,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", errText);
      return new Response(JSON.stringify({ error: "Erreur IA: " + errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    console.log("AI raw response:", content);

    // Parse the JSON from AI response
    let results: Array<{ dossier: string; resultat: string }>;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      results = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Parse error:", parseErr, "Content:", content);
      return new Response(JSON.stringify({ error: "Impossible de parser les résultats de l'IA", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all apprenants with exam dates containing "janvier"
    const { data: apprenants, error: fetchErr } = await supabase
      .from("apprenants")
      .select("id, nom, prenom, numero_dossier_cma, resultat_examen")
      .or("date_examen_theorique.ilike.%janvier%,date_examen_theorique.ilike.%Janvier%");

    if (fetchErr) {
      return new Response(JSON.stringify({ error: "Erreur DB: " + fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a map of dossier -> result from PDF
    const dossierMap = new Map<string, string>();
    for (const r of results) {
      // Normalize: remove leading zeros for comparison too, but keep original
      dossierMap.set(r.dossier, r.resultat.toLowerCase().includes("non") ? "non" : "oui");
    }

    const updates: Array<{ id: string; nom: string; prenom: string; resultat: string; dossier: string | null }> = [];

    for (const a of apprenants || []) {
      let resultat: string;
      if (!a.numero_dossier_cma) {
        resultat = "absent";
      } else if (dossierMap.has(a.numero_dossier_cma)) {
        resultat = dossierMap.get(a.numero_dossier_cma)!;
      } else {
        // Try without leading zeros
        const stripped = a.numero_dossier_cma.replace(/^0+/, "");
        const found = [...dossierMap.entries()].find(([k]) => k.replace(/^0+/, "") === stripped);
        if (found) {
          resultat = found[1];
        } else {
          resultat = "absent";
        }
      }

      // Update in DB
      const { error: updateErr } = await supabase
        .from("apprenants")
        .update({ resultat_examen: resultat })
        .eq("id", a.id);

      if (!updateErr) {
        updates.push({ id: a.id, nom: a.nom, prenom: a.prenom, resultat, dossier: a.numero_dossier_cma });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      totalExtracted: results.length,
      totalUpdated: updates.length,
      details: updates,
      extractedFromPdf: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
