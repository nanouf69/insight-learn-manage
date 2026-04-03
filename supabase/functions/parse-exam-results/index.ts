import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Remove accents and lowercase */
function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fileName, examType } = await req.json();
    // examType: "admissibilite" (théorie) or "admission" (pratique)
    const type = examType === "admission" ? "admission" : "admissibilite";

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
    const uint8 = new Uint8Array(arrayBuffer);
    // Convert in chunks to avoid stack overflow on large files
    let base64 = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      base64 += String.fromCharCode(...uint8.slice(i, i + chunkSize));
    }
    base64 = btoa(base64);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const promptText = `Analyse ce document PDF de résultats d'examen.

Extrais TOUS les candidats avec leur Nom, Prénom et résultat.

Le résultat peut être :
- "Admis" ou "Admissible" → résultat positif
- "Ajourné" ou "Non admissible" ou "Non admis" → résultat négatif

Réponds UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après. Le format doit être exactement:
[{"nom": "DUPONT", "prenom": "Jean", "resultat": "admis"}, {"nom": "MARTIN", "prenom": "Pierre", "resultat": "ajourne"}]

- "nom" = le nom de famille EN MAJUSCULES
- "prenom" = le prénom avec majuscule initiale
- "resultat" = "admis" si le candidat a réussi, "ajourne" sinon

Si tu trouves aussi un numéro de dossier, ajoute-le: {"nom": "DUPONT", "prenom": "Jean", "resultat": "admis", "dossier": "00017322"}

Ne mets aucune explication, juste le tableau JSON.`;

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
              { type: "text", text: promptText },
              {
                type: "image_url",
                image_url: { url: `data:application/pdf;base64,${base64}` },
              },
            ],
          },
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
    let results: Array<{ nom: string; prenom: string; resultat: string; dossier?: string }>;
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

    // Fetch ALL apprenants
    const { data: apprenants, error: fetchErr } = await supabase
      .from("apprenants")
      .select("id, nom, prenom, numero_dossier_cma, resultat_examen, resultat_examen_pratique");

    if (fetchErr) {
      return new Response(JSON.stringify({ error: "Erreur DB: " + fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build normalized lookup from PDF results
    const pdfResults = results.map(r => ({
      ...r,
      normNom: normalize(r.nom),
      normPrenom: normalize(r.prenom),
      mappedResultat: r.resultat.toLowerCase().includes("ajourne") || r.resultat.toLowerCase().includes("non") ? "non" : "oui",
    }));

    // Build apprenant lookup
    const apprenantList = (apprenants || []).map(a => ({
      ...a,
      normNom: normalize(a.nom),
      normPrenom: normalize(a.prenom),
    }));

    const matched: Array<{ id: string; nom: string; prenom: string; resultat: string; dossier?: string }> = [];
    const notFound: Array<{ nom: string; prenom: string; resultat: string }> = [];

    for (const pdfEntry of pdfResults) {
      // Try matching by name (accent/case insensitive)
      let found = apprenantList.find(
        a => a.normNom === pdfEntry.normNom && a.normPrenom === pdfEntry.normPrenom
      );

      // If not found by exact normalized name, try with dossier number
      if (!found && pdfEntry.dossier) {
        found = apprenantList.find(a => {
          if (!a.numero_dossier_cma) return false;
          return a.numero_dossier_cma.replace(/^0+/, "") === pdfEntry.dossier!.replace(/^0+/, "");
        });
      }

      // If still not found, try fuzzy: last name matches exactly, first name starts with
      if (!found) {
        found = apprenantList.find(
          a => a.normNom === pdfEntry.normNom && (
            a.normPrenom.startsWith(pdfEntry.normPrenom) || pdfEntry.normPrenom.startsWith(a.normPrenom)
          )
        );
      }

      if (found) {
        // Update the correct field based on exam type
        const updateField = type === "admission"
          ? { resultat_examen_pratique: pdfEntry.mappedResultat }
          : { resultat_examen: pdfEntry.mappedResultat };

        const { error: updateErr } = await supabase
          .from("apprenants")
          .update(updateField)
          .eq("id", found.id);

        if (!updateErr) {
          matched.push({
            id: found.id,
            nom: found.nom,
            prenom: found.prenom,
            resultat: pdfEntry.mappedResultat,
            dossier: pdfEntry.dossier,
          });
        }
      } else {
        notFound.push({
          nom: pdfEntry.nom,
          prenom: pdfEntry.prenom,
          resultat: pdfEntry.mappedResultat,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      examType: type,
      totalExtracted: results.length,
      totalMatched: matched.length,
      totalNotFound: notFound.length,
      matched,
      notFound,
      extractedFromPdf: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
