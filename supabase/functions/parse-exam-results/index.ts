import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Remove accents and lowercase. Tolerates null/undefined/non-string values. */
function normalize(s: unknown): string {
  if (s === null || s === undefined) return "";
  const str = typeof s === "string" ? s : String(s);
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Normalize a CMA dossier number: keep digits only, strip leading zeros */
function normalizeDossier(s: unknown): string {
  if (s === null || s === undefined) return "";
  const digits = String(s).replace(/\D/g, "").replace(/^0+/, "");
  return digits;
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

Ajoute TOUJOURS le numéro de dossier quand il figure dans le document: {"nom": "DUPONT", "prenom": "Jean", "resultat": "admis", "dossier": "00017322"}

IMPORTANT : certains documents ne contiennent QUE le numéro de dossier et le résultat, sans nom ni prénom. Dans ce cas renvoie quand même la ligne avec le numéro de dossier et le résultat, en omettant "nom" et "prenom" : {"dossier": "00017322", "resultat": "admis"}. N'invente jamais un nom ou un prénom.

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
    let results: Array<{ nom?: string; prenom?: string; resultat?: string; dossier?: string }>;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      const parsed = JSON.parse(jsonMatch[0]);
      results = Array.isArray(parsed) ? parsed.filter((r) => r && typeof r === "object") : [];
    } catch (parseErr) {
      console.error("Parse error:", parseErr, "Content:", content);
      return new Response(JSON.stringify({ error: "Impossible de parser les résultats de l'IA", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ALL apprenants (paginated to bypass 1000-row Supabase default cap)
    const apprenants: Array<{ id: string; nom: string; prenom: string; numero_dossier_cma: string | null }> = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data: page, error: fetchErr } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, numero_dossier_cma")
        .range(from, from + pageSize - 1);

      if (fetchErr) {
        return new Response(JSON.stringify({ error: "Erreur DB: " + fetchErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!page || page.length === 0) break;
      apprenants.push(...page);
      if (page.length < pageSize) break;
      from += pageSize;
    }

    // Build normalized lookup from PDF results (tolerant: any field may be missing)
    const ignored: Array<{ ligne: unknown; raison: string }> = [];
    const pdfResults = results
      .map((r) => {
        const normResultat = normalize(r.resultat);
        const normNom = normalize(r.nom);
        const normPrenom = normalize(r.prenom);
        const normDossier = normalizeDossier(r.dossier);
        return {
          nom: typeof r.nom === "string" ? r.nom : "",
          prenom: typeof r.prenom === "string" ? r.prenom : "",
          resultat: typeof r.resultat === "string" ? r.resultat : "",
          dossier: typeof r.dossier === "string" || typeof r.dossier === "number" ? String(r.dossier) : undefined,
          normNom,
          normPrenom,
          normDossier,
          mappedResultat:
            normResultat.includes("ajourn") || normResultat.includes("non") || normResultat.includes("echec")
              ? "non"
              : "oui",
          hasResultat: normResultat.length > 0,
          hasIdentity: normNom.length > 0 || normDossier.length > 0,
        };
      })
      .filter((r) => {
        if (!r.hasResultat) {
          ignored.push({ ligne: { nom: r.nom, prenom: r.prenom, dossier: r.dossier }, raison: "Résultat illisible" });
          return false;
        }
        if (!r.hasIdentity) {
          ignored.push({ ligne: { resultat: r.resultat }, raison: "Ni nom ni numéro de dossier lisible" });
          return false;
        }
        return true;
      });


    // Build apprenant indexes for O(1) lookup
    const byNamePrenom = new Map<string, typeof apprenants[number]>();
    const byNameOnly = new Map<string, typeof apprenants[number][]>();
    const byDossier = new Map<string, typeof apprenants[number]>();
    for (const a of apprenants) {
      const nn = normalize(a.nom);
      const np = normalize(a.prenom);
      byNamePrenom.set(`${nn}|${np}`, a);
      const list = byNameOnly.get(nn) || [];
      list.push(a);
      byNameOnly.set(nn, list);
      const nd = normalizeDossier(a.numero_dossier_cma);
      if (nd) byDossier.set(nd, a);
    }

    const matched: Array<{ id: string; nom: string; prenom: string; resultat: string; dossier?: string }> = [];
    const notFound: Array<{ nom: string; prenom: string; resultat: string; dossier?: string }> = [];
    const updates: Array<{ id: string; entry: typeof pdfResults[number]; apprenant: typeof apprenants[number] }> = [];

    for (const pdfEntry of pdfResults) {
      let found: typeof apprenants[number] | undefined;

      // 1) Numéro de dossier (fiable, et seul identifiant de certains PDF)
      if (pdfEntry.normDossier) {
        found = byDossier.get(pdfEntry.normDossier);
      }

      // 2) Nom + prénom exacts
      if (!found && pdfEntry.normNom && pdfEntry.normPrenom) {
        found = byNamePrenom.get(`${pdfEntry.normNom}|${pdfEntry.normPrenom}`);
      }

      if (!found && pdfEntry.normNom) {
        const candidates = byNameOnly.get(pdfEntry.normNom);
        if (candidates && candidates.length > 0) {
          if (!pdfEntry.normPrenom && candidates.length === 1) {
            found = candidates[0];
          } else if (pdfEntry.normPrenom) {
            found = candidates.find((a) => {
              const np = normalize(a.prenom);
              return np && (np.startsWith(pdfEntry.normPrenom) || pdfEntry.normPrenom.startsWith(np));
            });
          }
        }
      }

      if (found) {
        updates.push({ id: found.id, entry: pdfEntry, apprenant: found });
      } else {
        notFound.push({
          nom: pdfEntry.nom,
          prenom: pdfEntry.prenom,
          resultat: pdfEntry.mappedResultat,
          dossier: pdfEntry.dossier,
        });
      }
    }

    // Run updates in parallel batches to avoid the 150s idle timeout
    const batchSize = 25;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(u => {
        const updateField = type === "admission"
          ? { resultat_examen_pratique: u.entry.mappedResultat }
          : { resultat_examen: u.entry.mappedResultat };
        return supabase.from("apprenants").update(updateField).eq("id", u.id);
      }));
      results.forEach((res, idx) => {
        const u = batch[idx];
        if (!res.error) {
          matched.push({
            id: u.id,
            nom: u.apprenant.nom,
            prenom: u.apprenant.prenom,
            resultat: u.entry.mappedResultat,
            dossier: u.entry.dossier,
          });
        } else {
          ignored.push({
            ligne: { nom: u.apprenant.nom, prenom: u.apprenant.prenom, dossier: u.entry.dossier },
            raison: "Enregistrement refusé : " + res.error.message,
          });
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      examType: type,
      totalExtracted: results.length,
      totalMatched: matched.length,
      totalNotFound: notFound.length,
      totalIgnored: ignored.length,
      matched,
      notFound,
      ignored,
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
