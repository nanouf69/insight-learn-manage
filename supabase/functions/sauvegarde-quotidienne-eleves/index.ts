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
const PART = 2000;
const RETENTION_JOURS = 30;

// Chaque appel traite au plus 2 000 lignes d'une table puis relance l'appel suivant
// (limite de calcul des fonctions). Paramètres : { i, from, jour }.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);
  const body = await req.json().catch(() => ({}));
  const i: number = Number(body.i ?? 0);
  const from: number = Number(body.from ?? 0);
  const jour: string = body.jour ?? new Date().toISOString().slice(0, 10);
  const suivant = (next: Record<string, unknown>) => fetch(`${url}/functions/v1/sauvegarde-quotidienne-eleves`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
    body: JSON.stringify({ jour, ...next }),
  }).catch((e) => console.error("[chaine]", e));

  if (i >= TABLES.length) {
    await rotation(sb);
    await sb.storage.from(BUCKET).upload(`${jour}/_termine.json`, new Blob([JSON.stringify({ jour, fin: new Date().toISOString() })], { type: "application/json" }), { upsert: true });
    return new Response(JSON.stringify({ ok: true, termine: true, jour }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const t = TABLES[i];
  let fini = false, n = 0;
  try {
    const buf: unknown[] = [];
    let f = from;
    while (buf.length < PART) {
      const { data, error } = await sb.from(t).select("*").range(f, f + PAGE - 1);
      if (error) throw error;
      if (!data?.length) { fini = true; break; }
      buf.push(...data); f += data.length;
      if (data.length < PAGE) { fini = true; break; }
    }
    n = buf.length;
    if (n) {
      const { error } = await sb.storage.from(BUCKET).upload(`${jour}/${t}/part-${String(from).padStart(8, "0")}.json`,
        new Blob([JSON.stringify(buf)], { type: "application/json" }), { upsert: true });
      if (error) throw error;
    }
  } catch (e) {
    console.error(`[sauvegarde] ${t}`, e);
    await sb.storage.from(BUCKET).upload(`${jour}/_erreurs/${t}-${from}.txt`, new Blob([String((e as Error)?.message ?? e)]), { upsert: true });
    fini = true;
  }
  const next = fini ? { i: i + 1, from: 0 } : { i, from: from + n };
  // @ts-ignore EdgeRuntime existe dans l'environnement des fonctions
  EdgeRuntime.waitUntil(suivant(next));
  return new Response(JSON.stringify({ ok: true, table: t, from, n, next }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

// Rotation : retirer uniquement les dossiers de SAUVEGARDE de plus de 30 jours.
async function rotation(sb: any) {
  try {
    const limite = new Date(Date.now() - RETENTION_JOURS * 86400000).toISOString().slice(0, 10);
    const { data: dossiers } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
    for (const d of dossiers ?? []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.name) || d.name >= limite) continue;
      for (const t of [...TABLES, "_erreurs", ""]) {
        const prefix = t ? `${d.name}/${t}` : d.name;
        const { data: files } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
        const paths = (files ?? []).filter((f: any) => f.id).map((f: any) => `${prefix}/${f.name}`);
        if (paths.length) await sb.storage.from(BUCKET).remove(paths);
      }
    }
  } catch (e) { console.error("[rotation]", e); }
}
