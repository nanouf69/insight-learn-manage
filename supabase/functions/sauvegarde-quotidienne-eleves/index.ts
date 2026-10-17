// Export nocturne de toutes les données élèves vers le stockage privé « sauvegardes-eleves ».
// Un dossier par jour (AAAA-MM-JJ/table/part-N.json). Conservation 30 jours (seules les
// anciennes COPIES de sauvegarde sont retirées, jamais une donnée élève).
//
// 07/10/2026 (B2) : l'ancienne version enchaînait ~370 appels d'affilée et s'arrêtait
// chaque nuit après 6 tables sur 23. Désormais :
//  - un appel = un paquet de 2 000 lignes (limite de calcul respectée), lecture triée par clé ;
//  - l'avancement est enregistré dans « _etat.json » ; une chaîne s'arrête d'elle-même après
//    40 paquets et une tâche de reprise (toutes les 2 minutes la nuit) repart du point exact ;
//  - « _termine.json » (avec le nombre de lignes de chacune des 23 tables) n'est écrit
//    qu'à la fin complète sans erreur, sinon « _incomplet.json » + alerte.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { EXPORT_TABLES, EXPORT_VERSION, exportManifest } from './manifest.ts';

const TABLES = EXPORT_TABLES;
const BUCKET = "sauvegardes-eleves";
const PAGE = 1000;
const PART = 2000;
// Tables aux lignes volumineuses (signatures, progression détaillée, snapshots) :
// paquets plus petits pour rester sous la limite de calcul d'un appel.
// 07/10/2026 soir : découpage plus fin des tables lourdes (lignes jusqu'à ~84 ko).
const TAILLES: Record<string, [number, number]> = {
  apprenant_module_completion: [5, 20], emargements_fc: [10, 40], apprenant_documents_completes: [10, 50],
  bilan_passage_snapshots: [5, 20], apprenant_quiz_results: [100, 400], exam_attempts_v2: [50, 200],
  apprenant_question_temps: [500, 1500], answer_events: [250, 1000], apprenant_module_activites: [500, 1500],
  qrc_instances_v2: [100, 400], bilan_passages_figes: [25, 100], answer_state_historique: [250, 1000],
};
const MAX_SAUTS = 40;
const BAIL_MS = 90_000;
const RETENTION_JOURS = 30;

type Etat = { jour: string; i: number; from: number; comptes: Record<string, number>; erreurs: string[]; maj: string; termine?: boolean; pos?: string; essais?: number; version?: number; table_names?: string[] };

const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response('Service indisponible', { status: 503, headers: corsHeaders });
  // Preserve existing unmanaged scheduled callbacks; auth migration requires managed scheduling support.
  const sb = createClient(url, key);
  const body = await req.json().catch(() => ({}));
  const jour: string = body.jour ?? new Date().toISOString().slice(0, 10);
  const saut: number = Number(body.saut ?? 0);
  const chaine = body.chaine === true;
  const reprise = body.reprise === true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || !Number.isInteger(saut) || saut < 0 || saut > MAX_SAUTS) return new Response('Paramètres invalides', { status: 400, headers: corsHeaders });

  const up = async (path: string, content: unknown) => {
    const result = await sb.storage.from(BUCKET).upload(path, new Blob([JSON.stringify(content)], { type: "application/json" }), { upsert: true });
    if (result.error) throw new Error('Écriture du point de reprise impossible');
    return result;
  };
  const lireEtat = async (): Promise<Etat | null> => {
    const { data } = await sb.storage.from(BUCKET).download(`${jour}/_etat.json`);
    if (!data) return null;
    try { return JSON.parse(await data.text()); } catch { return null; }
  };

  let etat = await lireEtat();
  if (etat?.termine) return json({ ok: true, deja_termine: true, jour, version: etat.version ?? 1, tables: etat.table_names?.length ?? Object.keys(etat.comptes).length });
  if (!etat) {
    if (reprise) return json({ ok: true, rien_a_reprendre: true, jour });
    etat = { jour, i: 0, from: 0, comptes: {}, erreurs: [], maj: new Date(0).toISOString(), version: EXPORT_VERSION, table_names: TABLES.map(([name]) => name) };
  } else if (!chaine && Date.now() - new Date(etat.maj).getTime() < BAIL_MS) {
    // Une chaîne est déjà active : ne jamais en lancer une deuxième en parallèle.
    return json({ ok: true, chaine_active: true, i: etat.i, from: etat.from });
  }

  // An unfinished legacy export adopts appended tables without changing its cursor.
  etat.version = EXPORT_VERSION;
  etat.table_names = TABLES.map(([name]) => name);
  if (etat.i < TABLES.length) {
    const [t, pk] = TABLES[etat.i];
    const [page, part] = TAILLES[t] ?? [PAGE, PART];
    // Un paquet qui fait tomber l'appel 3 fois est signalé puis la table suivante est traitée
    // (jamais de blocage silencieux : la nuit se termine par « _incomplet.json » + alerte).
    const pos = `${etat.i}:${etat.from}`;
    etat.essais = etat.pos === pos ? (etat.essais ?? 0) + 1 : 1;
    etat.pos = pos;
    if (etat.essais > 3) {
      etat.erreurs.push(`${t}@${etat.from}: paquet trop lourd (3 échecs)`);
      etat.i += 1; etat.from = 0; etat.essais = 0;
      etat.maj = new Date().toISOString();
      await up(`${jour}/_etat.json`, etat);
      return json({ ok: false, saute: t });
    }
    etat.maj = new Date().toISOString();
    await up(`${jour}/_etat.json`, etat);
    try {
      const buf: unknown[] = [];
      let f = etat.from, fini = false;
      while (buf.length < part) {
        const { data, error } = await sb.from(t).select("*").order(pk, { ascending: true }).range(f, f + page - 1);
        if (error) throw error;
        if (!data?.length) { fini = true; break; }
        buf.push(...data); f += data.length;
        if (data.length < page) { fini = true; break; }
      }
      if (buf.length) {
        const { error } = await up(`${jour}/${t}/part-${String(etat.from).padStart(8, "0")}.json`, buf);
        if (error) throw error;
      }
      etat.comptes[t] = (etat.comptes[t] ?? 0) + buf.length;
      if (fini) { etat.i += 1; etat.from = 0; } else { etat.from += buf.length; }
    } catch (e) {
      const msg = String((e as Error)?.message ?? JSON.stringify(e));
      console.error(`[sauvegarde] ${t}`, msg);
      await sb.storage.from(BUCKET).upload(`${jour}/_erreurs/${t}-${etat.from}.txt`, new Blob([msg]), { upsert: true });
      etat.erreurs.push(`${t}@${etat.from}: ${msg}`);
      etat.i += 1; etat.from = 0;
    }
  }

  if (etat.i >= TABLES.length) {
    etat.maj = new Date().toISOString();
    const manifeste = { jour, fin: etat.maj, ...exportManifest(etat.comptes, etat.erreurs) };
    await up(manifeste.erreurs.length ? `${jour}/_incomplet.json` : `${jour}/_termine.json`, manifeste);
    etat.termine = true;
    await up(`${jour}/_etat.json`, etat);
    await rotation(sb); // Scheduled retention unchanged; never invoked manually.
    if (manifeste.erreurs.length) {
      await sb.from("alertes_systeme").insert({ type: "sauvegarde_incomplete", titre: "Sauvegarde nocturne incomplète", message: `Sauvegarde ${jour} incomplète : ${manifeste.erreurs.length} erreur(s)` } as any).then(() => {}, () => {});
    }
    return json({ ok: !manifeste.erreurs.length, termine: true, ...manifeste });
  }

  etat.maj = new Date().toISOString();
  await up(`${jour}/_etat.json`, etat);
  if (saut + 1 < MAX_SAUTS) {
    // @ts-ignore EdgeRuntime existe dans l'environnement des fonctions
    EdgeRuntime.waitUntil(fetch(`${url}/functions/v1/sauvegarde-quotidienne-eleves`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ jour, saut: saut + 1, chaine: true }),
    }).catch((e) => console.error("[chaine]", e)));
  } else {
    // Chaîne volontairement arrêtée : la reprise suivante attendra la fin du délai BAIL_MS.
    etat.maj = new Date(Date.now() - BAIL_MS).toISOString();
    await up(`${jour}/_etat.json`, etat);
  }
  return json({ ok: true, en_cours: true, i: etat.i, from: etat.from, saut });
});

// Rotation : retirer uniquement les dossiers de SAUVEGARDE de plus de 30 jours.
async function rotation(sb: any) {
  try {
    const limite = new Date(Date.now() - RETENTION_JOURS * 86400000).toISOString().slice(0, 10);
    const { data: dossiers } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
    for (const d of dossiers ?? []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.name) || d.name >= limite) continue;
      for (const t of [...TABLES.map(([n]) => n), "_erreurs", ""]) {
        const prefix = t ? `${d.name}/${t}` : d.name;
        const { data: files } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
        const paths = (files ?? []).filter((f: any) => f.id).map((f: any) => `${prefix}/${f.name}`);
        if (paths.length) await sb.storage.from(BUCKET).remove(paths);
      }
    }
  } catch (e) { console.error("[rotation]", e); }
}
