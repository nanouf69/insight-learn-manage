import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // Use Lovable AI to extract candidate names and their exam dates
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                text: `Analyse ce document PDF de planning d'examen pratique de la CMA (Chambre des Métiers et de l'Artisanat). 
Extrais TOUS les candidats avec leur nom, prénom, leur date d'examen pratique ET leur heure de passage.

Réponds UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après. Le format doit être exactement:
[{"nom": "DUPONT", "prenom": "Jean", "date_examen": "2026-03-02", "heure_passage": "09:00"}, {"nom": "MARTIN", "prenom": "Pierre", "date_examen": "2026-03-03", "heure_passage": "14:30"}]

- "nom" = le nom de famille en MAJUSCULES tel qu'il apparait dans le document
- "prenom" = le prénom tel qu'il apparait dans le document
- "date_examen" = la date d'examen pratique au format YYYY-MM-DD
- "heure_passage" = l'heure de passage au format HH:MM (24h). Si l'heure exacte n'est pas indiquée mais qu'une plage est donnée (ex: "matin", "après-midi"), utilise "09:00" pour le matin et "14:00" pour l'après-midi.

Si un candidat a plusieurs dates, prends la première date d'examen pratique.
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
    let results: Array<{ nom: string; prenom: string; date_examen: string; heure_passage?: string }>;
    try {
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

    // Fetch all apprenants
    const { data: apprenants, error: fetchErr } = await supabase
      .from("apprenants")
      .select("id, nom, prenom, date_examen_pratique, heure_examen_pratique");

    if (fetchErr) {
      return new Response(JSON.stringify({ error: "Erreur DB: " + fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize helper
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    // Match by name and update date_examen_pratique
    const updates: Array<{ id: string; nom: string; prenom: string; date_examen: string; matched: boolean }> = [];
    const notFound: Array<{ nom: string; prenom: string; date_examen: string }> = [];

    for (const r of results) {
      // Find matching apprenant by name
      const match = (apprenants || []).find(a => {
        const nomMatch = norm(a.nom) === norm(r.nom);
        const prenomMatch = norm(a.prenom) === norm(r.prenom);
        // Also try partial match (first word of prenom)
        const prenomPartial = norm(r.prenom).split(' ')[0] === norm(a.prenom).split(' ')[0];
        return nomMatch && (prenomMatch || prenomPartial);
      });

      if (match) {
        const updateData: Record<string, string> = { date_examen_pratique: r.date_examen };
        if (r.heure_passage) {
          updateData.heure_examen_pratique = r.heure_passage;
        }
        const { error: updateErr } = await supabase
          .from("apprenants")
          .update(updateData)
          .eq("id", match.id);

        updates.push({
          id: match.id,
          nom: match.nom,
          prenom: match.prenom,
          date_examen: r.date_examen,
          matched: !updateErr
        });
      } else {
        notFound.push(r);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      totalExtracted: results.length,
      totalUpdated: updates.filter(u => u.matched).length,
      totalNotFound: notFound.length,
      updates,
      notFound,
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
