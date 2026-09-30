// Export nocturne de toutes les données élèves vers le stockage privé « sauvegardes-eleves ».
// Un dossier par jour (AAAA-MM-JJ/table/part-N.json). Conservation 30 jours (seules les
// anciennes COPIES de sauvegarde sont retirées, jamais une donnée élève).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TABLES = [
  "apprenants", "session_apprenants", "reponses_apprenants", "reponses_apprenants_historique",
  "reponses_apprenants_journal", "apprenant_quiz_results", "apprenant_module_completion",
  "apprenant_module_activites", "apprenant_connexions", "apprenant_question_temps",
  "apprenant_documents_completes", "documents_inscription", "emargements_fc",
  "answer_state", "answer_state_historique", "answer_events", "exam_attempts_v2", "qrc_instances_v2",
  "qrc_correction_events", "core_exam_results", "bilan_passage_snapshots", "bilan_passages_figes",
  "donnees_eleves_suppressions",
];
const BUCKET = "sauvegardes-eleves";
const PAGE = 1000;
const PART = 5000;
const RETENTION_JOURS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jour = new Date().toISOString().slice(0, 10);
  const bilan: Record<string, number | string> = {};
  for (const t of TABLES) {
    try {
      let from = 0, part = 0, buf: unknown[] = [], total = 0;
      const flush = async () => {
        if (!buf.length) return;
        const { error } = await sb.storage.from(BUCKET).upload(`${jour}/${t}/part-${part++}.json`,
          new Blob([JSON.stringify(buf)], { type: "application/json" }), { upsert: true });
        if (error) throw error;
        buf = [];
      };
      while (true) {
        const { data, error } = await sb.from(t).select("*").range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data?.length) break;
        buf.push(...data); total += data.length; from += PAGE;
        if (buf.length >= PART) await flush();
        if (data.length < PAGE) break;
      }
      await flush();
      bilan[t] = total;
    } catch (e) {
      bilan[t] = "ERREUR: " + String((e as Error)?.message ?? e);
    }
  }
  await sb.storage.from(BUCKET).upload(`${jour}/_bilan.json`, new Blob([JSON.stringify({ jour, bilan, fin: new Date().toISOString() })], { type: "application/json" }), { upsert: true });

  // Rotation : retirer uniquement les dossiers de sauvegarde de plus de 30 jours.
  try {
    const limite = new Date(Date.now() - RETENTION_JOURS * 86400000).toISOString().slice(0, 10);
    const { data: dossiers } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
    for (const d of dossiers ?? []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.name) || d.name >= limite) continue;
      for (const t of [...TABLES, ""]) {
        const prefix = t ? `${d.name}/${t}` : d.name;
        const { data: files } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
        const paths = (files ?? []).filter((f) => f.id).map((f) => `${prefix}/${f.name}`);
        if (paths.length) await sb.storage.from(BUCKET).remove(paths);
      }
    }
  } catch (e) { console.error("[rotation]", e); }

  return new Response(JSON.stringify({ ok: true, jour, bilan }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
