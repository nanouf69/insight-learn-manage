// Export nocturne de toutes les données élèves vers le stockage privé « sauvegardes-eleves ».
// Un dossier par jour (AAAA-MM-JJ/table/part-N.json). Conservation 30 jours (seules les
// anciennes COPIES de sauvegarde sont retirées, jamais une donnée élève).
//
// 07/10/2026 (B2) : un appel = un paquet, avancement dans « _etat.json », chaîne de 40 paquets
// puis reprise par la tâche programmée.
//
// 07/11/2026 : la nuit du 07/11 s'est arrêtée sur « reponses_apprenants_journal » à la
// position 928 000 (lecture par décalage OFFSET de plus en plus lente sur 1,7 M lignes),
// la table a été abandonnée dès la PREMIÈRE erreur, puis « termine » a été posé malgré
// l'erreur : les reprises répondaient « déjà terminé » sans rien réparer. Désormais :
//  - lecture par clé : reprise bornée ; aucune garantie de snapshot sous concurrence ;
//  - une erreur ne fait plus sauter la table : même position réessayée (attente croissante),
//    abandon signalé seulement après 3 échecs au même endroit ;
//  - comptes début/fin = observations, PAS preuve de couverture/cohérence/restauration ;
//  - « _export_termine.json » = parcours achevé, intégrité/restauration NON PROUVÉES ;
//  - une journée incomplète peut être RÉPARÉE sur demande explicite ({ jour, reparer: true }) :
//    nouvel export complet des seules tables en erreur dans « _reparation-1/ », sans toucher
//    aux fichiers déjà écrits ni à « _incomplet.json ». Jamais lancé automatiquement.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { EXPORT_TABLES, EXPORT_VERSION, exportManifest } from './manifest.ts';

const TABLES = EXPORT_TABLES;
const BUCKET = "sauvegardes-eleves";
const PAGE = 1000;
const PART = 2000;
// Tables aux lignes volumineuses (signatures, progression détaillée, snapshots) :
// paquets plus petits pour rester sous la limite de calcul d'un appel.
const TAILLES: Record<string, [number, number]> = {
  apprenant_module_completion: [5, 20], emargements_fc: [10, 40], apprenant_documents_completes: [10, 50],
  bilan_passage_snapshots: [5, 20], apprenant_quiz_results: [100, 400], exam_attempts_v2: [50, 200],
  apprenant_question_temps: [500, 1500], answer_events: [250, 1000], apprenant_module_activites: [500, 1500],
  qrc_instances_v2: [100, 400], bilan_passages_figes: [25, 100], answer_state_historique: [250, 1000],
};
const MAX_SAUTS = 40;
const BAIL_MS = 90_000;
const RETENTION_JOURS = 30;
const MAX_ECHECS = 3;
const REPARATION_DOSSIER = "_reparation-1";
// Réparation bornée du seul journal volumineux : moins d'appels, pages par clé inchangées.
const PART_REPARATION: Record<string, number> = { reponses_apprenants_journal: 10_000 };

type Preuve = { debut: number; fin?: number; mode: "cle" | "decalage"; dernier?: string | number | null };
/** Avancement d'un export (journée principale ou réparation). Champs historiques conservés. */
type Job = {
  i: number; from: number; comptes: Record<string, number>; erreurs: string[];
  pos?: string; essais?: number; table_names?: string[];
  /** Lecture par clé : dernière clé exportée de la table en cours (null = début). Absent = ancien curseur par décalage. */
  curseur?: string | number | null;
  preuves?: Record<string, Preuve>;
  derniere_erreur?: string;
};
type Etat = Job & {
  jour: string; maj: string; termine?: boolean; version?: number;
  reparation?: Job & { debut: string; termine?: boolean };
};

const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
const pkDe = (t: string) => TABLES.find(([n]) => n === t)?.[1] ?? "id";

/** Avance d'UN paquet. Ne lève jamais pour une erreur de lecture : la position est conservée. */
async function exporterPaquet(sb: any, job: Job, tables: string[], prefixe: string, up: (p: string, c: unknown) => Promise<unknown>, partReparation?: number): Promise<"avance" | "echec" | "abandon"> {
  const t = tables[job.i];
  const pk = pkDe(t);
  const [page, partDefaut] = TAILLES[t] ?? [PAGE, PART];
  const part = partReparation ?? partDefaut;
  job.preuves ??= {};
  const pos = `${job.i}:${job.from}`;
  job.essais = job.pos === pos ? (job.essais ?? 0) + 1 : 1;
  job.pos = pos;
  if (job.essais > MAX_ECHECS) {
    // Abandon explicite et signalé (jamais silencieux, jamais compté comme réussi).
    job.erreurs.push(`${t}@${job.from}: ${MAX_ECHECS} échecs au même endroit${job.derniere_erreur ? ` (${job.derniere_erreur})` : ""}`);
    job.i += 1; job.from = 0; job.essais = 0; job.curseur = undefined; job.derniere_erreur = undefined;
    return "abandon";
  }
  // Ancien curseur par décalage (export commencé avant ce correctif) : il n'est jamais déplacé.
  const decalage = job.from > 0 && job.curseur === undefined;
  try {
    if (!decalage && job.from === 0 && (job.curseur === undefined || job.curseur === null)) {
      const { count, error } = await sb.from(t).select(pk, { count: "exact", head: true });
      if (error) throw error;
      if (typeof count !== "number") throw new Error("comptage indisponible");
      job.preuves[t] = { debut: count, mode: "cle" };
      job.curseur = null;
      job.comptes[t] = 0;
    }
    const buf: any[] = [];
    let fini = false;
    let curseur = job.curseur ?? null;
    let f = job.from;
    while (buf.length < part) {
      let q = sb.from(t).select("*").order(pk, { ascending: true });
      let res: any;
      if (decalage) {
        res = await q.range(f, f + page - 1);
      } else {
        if (curseur !== null) q = q.gt(pk, curseur);
        res = await q.limit(page);
      }
      if (res.error) throw res.error;
      const data = res.data ?? [];
      if (!data.length) { fini = true; break; }
      for (const row of data) {
        const k = row?.[pk];
        if (k === null || k === undefined) throw new Error(`clé ${pk} absente`);
        if (!decalage && curseur !== null && !(cmpCle(k, curseur) > 0)) throw new Error("ordre des clés non croissant");
        if (!decalage) curseur = k;
      }
      buf.push(...data); f += data.length;
      if (data.length < page) { fini = true; break; }
    }
    if (buf.length) {
      // Nom fixé par la position : un nouvel essai réécrit le même fichier (idempotent).
      await up(`${prefixe}/${t}/part-${String(job.from).padStart(8, "0")}.json`, buf);
    }
    const total = (job.comptes[t] ?? 0) + buf.length;
    let finale: number | null = null;
    if (fini && !decalage && job.preuves[t]) {
      // Comptage final AVANT toute mise à jour de l'avancement : un échec ici
      // laisse la position intacte et le paquet sera simplement réécrit.
      const { count, error } = await sb.from(t).select(pk, { count: "exact", head: true });
      if (error) throw error;
      if (typeof count !== "number") throw new Error("comptage final indisponible");
      finale = count;
    }
    // Succès complet : l'avancement n'est modifié qu'ici.
    job.comptes[t] = total;
    if (!decalage) job.curseur = curseur;
    if (fini) {
      const preuve = job.preuves[t];
      if (preuve && finale !== null) {
        preuve.fin = finale; preuve.dernier = curseur;
        // Une variation détectée est signalée ; des comptes égaux n'excluent ni
        // une insertion derrière le curseur ni une mise à jour concomitante.
        if (total !== preuve.debut || total !== finale) job.erreurs.push(`${t}: comptes divergents (${total} exportées, ${preuve.debut} au début, ${finale} à la fin)`);
      } else if (decalage) {
        job.preuves[t] = { debut: -1, mode: "decalage" };
      }
      job.i += 1; job.from = 0; job.curseur = undefined;
    } else {
      job.from += buf.length;
    }
    job.essais = 0; job.derniere_erreur = undefined;
    return "avance";
  } catch (e) {
    const msg = String((e as any)?.code ? `${(e as any).code} ${(e as any).message ?? ""}` : (e as Error)?.message ?? JSON.stringify(e)).slice(0, 500);
    console.error(`[sauvegarde] ${t}@${job.from}`, msg);
    job.derniere_erreur = msg;
    await sb.storage.from(BUCKET).upload(`${prefixe}/_erreurs/${t}-${job.from}.txt`, new Blob([msg]), { upsert: true }).catch(() => {});
    // Position conservée : le prochain appel réessaie EXACTEMENT ce paquet.
    return "echec";
  }
}

function cmpCle(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (/^\d+$/.test(String(a)) && /^\d+$/.test(String(b))) { const x = BigInt(String(a)), y = BigInt(String(b)); return x === y ? 0 : x > y ? 1 : -1; }
  const x = String(a).toLowerCase(), y = String(b).toLowerCase();
  return x === y ? 0 : x > y ? 1 : -1;
}

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
  const reparer = body.reparer === true;
  // Read-only, fixed paths, admin verified: private manifests never become public.
  if (body.diagnostic === true) {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return new Response("Non autorisé", { status: 401, headers: corsHeaders });
    const { data: auth, error: authError } = await sb.auth.getUser(token);
    if (authError || !auth.user) return new Response("Non autorisé", { status: 401, headers: corsHeaders });
    const { data: role, error: roleError } = await sb.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle();
    if (roleError || !role || !/^2026-11-(11|12)$/.test(jour)) return new Response("Accès refusé", { status: 403, headers: corsHeaders });
    const fichiers: Record<string, unknown> = {};
    for (const nom of ["_etat.json", "_incomplet.json", "_erreurs/reponses_apprenants_journal-0.txt", "_erreurs/answer_state_historique-0.txt", "_reparation-1/_export_termine.json", "_reparation-1/_incomplet.json"]) {
      const { data, error } = await sb.storage.from(BUCKET).download(`${jour}/${nom}`);
      if (error || !data) { fichiers[nom] = { absent: true }; continue; }
      const texte = await data.text();
      try { fichiers[nom] = JSON.parse(texte); } catch { fichiers[nom] = { message: texte }; }
    }
    // Bounded probes isolate count timeout from page/serialization failures.
    const sondes: Record<string, unknown> = {};
    if (body.sonder === true) {
      for (const t of ["reponses_apprenants_journal", "answer_state_historique"]) {
        const pk = pkDe(t);
        const debut = Date.now();
        const c = await sb.from(t).select(pk, { count: "exact", head: true });
        const r = await sb.from(t).select("*").order(pk).limit(10);
        const err = (e: any) => e ? { code: e.code ?? null, message: e.message || e.details || "erreur sans message", status: e.status ?? null } : null;
        sondes[t] = { count: c.count, count_error: err(c.error), page_count: r.data?.length ?? null, page_error: err(r.error), duree_ms: Date.now() - debut };
      }
    }
    return json({ jour, fichiers, sondes });
  }
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
  const enchainer = (attenteMs = 0) => {
    if (saut + 1 >= MAX_SAUTS) return false;
    // @ts-ignore EdgeRuntime existe dans l'environnement des fonctions
    EdgeRuntime.waitUntil(new Promise((r) => setTimeout(r, attenteMs)).then(() => fetch(`${url}/functions/v1/sauvegarde-quotidienne-eleves`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ jour, saut: saut + 1, chaine: true }),
    })).catch((e) => console.error("[chaine]", e)));
    return true;
  };

  let etat = await lireEtat();

  // Journée terminée : rien à refaire, sauf réparation EXPLICITE d'une journée incomplète.
  if (etat?.termine) {
    const incomplet = (etat.erreurs?.length ?? 0) > 0;
    if (!incomplet) return json({ ok: true, deja_termine: true, integrite: "non_verifiee", restauration: "non_prouvee", jour, version: etat.version ?? 1, tables: etat.table_names?.length ?? Object.keys(etat.comptes).length });
    if (etat.reparation?.termine) return json({ ok: (etat.reparation.erreurs ?? []).length === 0, deja_repare: true, jour, erreurs: etat.reparation.erreurs, comptes: etat.reparation.comptes, integrite: "non_verifiee", restauration: "non_prouvee", instantane_coherent: false });
    if (!etat.reparation) {
      if (!reparer) return json({ ok: false, incomplet: true, jour, erreurs: etat.erreurs, action: "réparation sur demande explicite { jour, reparer: true }" });
      const aRefaire = [...new Set(etat.erreurs.map((e) => e.split(/[@:]/)[0]).filter((n) => TABLES.some(([t]) => t === n)))];
      etat.reparation = { debut: new Date().toISOString(), i: 0, from: 0, comptes: {}, erreurs: [], table_names: aRefaire, preuves: {} };
      etat.maj = new Date(0).toISOString();
      await up(`${jour}/_etat.json`, etat);
    } else if (!chaine && Date.now() - new Date(etat.maj).getTime() < BAIL_MS) {
      return json({ ok: true, chaine_active: true, reparation: true, i: etat.reparation.i, from: etat.reparation.from });
    }
    const r = etat.reparation;
    if (!r) return json({ ok: false, erreur: "reparation_absente" });
    const tables = r.table_names ?? [];
    let resultat: string = "avance";
    if (r.i < tables.length) {
      etat.maj = new Date().toISOString();
      await up(`${jour}/_etat.json`, etat);
      resultat = await exporterPaquet(sb, r, tables, `${jour}/${REPARATION_DOSSIER}`, up, tables[r.i] ? PART_REPARATION[tables[r.i]] : undefined);
    }
    if (r.i >= tables.length) {
      const manquantes = tables.filter((t) => !r.preuves?.[t] || r.preuves[t].mode !== "cle" || typeof r.preuves[t].fin !== "number");
      const erreurs = [...r.erreurs, ...manquantes.map((t) => `${t}: preuve de couverture absente`)];
      etat.maj = new Date().toISOString();
      // Réexport indépendant : jamais fusionné avec les tables d'une autre nuit,
      // jamais un nouveau _termine.json pour la journée historique.
      const manifeste = {
        jour, fin: etat.maj, tables: tables.length, table_names: tables, comptes: r.comptes, erreurs,
        export_termine: true, integrite: "non_verifiee", restauration: "non_prouvee",
        instantane_coherent: false, provenance: "reexport_independant_tables_selectionnees",
        reparation_debut: r.debut, observations: r.preuves ?? {},
        sources: Object.fromEntries(tables.map((t) => [t, `${REPARATION_DOSSIER}/${t}`])),
      };
      await up(`${jour}/${REPARATION_DOSSIER}/${erreurs.length ? "_incomplet.json" : "_export_termine.json"}`, manifeste);
      r.erreurs = erreurs;
      r.termine = true;
      await up(`${jour}/_etat.json`, etat);
      return json({ ok: r.erreurs.length === 0, reexport_termine: true, integrite: "non_verifiee", restauration: "non_prouvee", instantane_coherent: false, jour, erreurs: r.erreurs, comptes: r.comptes });
    }
    etat.maj = new Date().toISOString();
    await up(`${jour}/_etat.json`, etat);
    if (!enchainer(resultat === "echec" ? 5_000 * (r.essais ?? 1) : 0)) {
      etat.maj = new Date(Date.now() - BAIL_MS).toISOString();
      await up(`${jour}/_etat.json`, etat);
    }
    return json({ ok: true, en_cours: true, reparation: true, i: r.i, from: r.from, saut });
  }

  if (!etat) {
    if (reprise) return json({ ok: true, rien_a_reprendre: true, jour });
    etat = { jour, i: 0, from: 0, comptes: {}, erreurs: [], maj: new Date(0).toISOString(), version: EXPORT_VERSION, table_names: TABLES.map(([name]) => name), preuves: {} };
  } else if (!chaine && Date.now() - new Date(etat.maj).getTime() < BAIL_MS) {
    // Une chaîne est déjà active : ne jamais en lancer une deuxième en parallèle.
    return json({ ok: true, chaine_active: true, i: etat.i, from: etat.from });
  }

  // An unfinished legacy export adopts appended tables without changing its cursor.
  etat.version = EXPORT_VERSION;
  etat.table_names = TABLES.map(([name]) => name);
  let resultat: string = "avance";
  if (etat.i < TABLES.length) {
    etat.maj = new Date().toISOString();
    await up(`${jour}/_etat.json`, etat);
    // Un abandon (3 échecs) est consigné dans etat.erreurs ; la chaîne continue
    // avec la table suivante au lieu d'attendre la reprise programmée.
    resultat = await exporterPaquet(sb, etat, TABLES.map(([n]) => n), jour, up);
  }

  if (etat.i >= TABLES.length) {
    etat.maj = new Date().toISOString();
    const manifeste = { jour, fin: etat.maj, ...exportManifest(etat.comptes, etat.erreurs), observations: etat.preuves ?? {}, export_termine: true, integrite: "non_verifiee", restauration: "non_prouvee", instantane_coherent: false, ancien_curseur: Object.values(etat.preuves ?? {}).some((p) => p.mode === "decalage") };
    await up(manifeste.erreurs.length ? `${jour}/_incomplet.json` : `${jour}/_export_termine.json`, manifeste);
    etat.erreurs = manifeste.erreurs;
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
  if (!enchainer(resultat === "echec" ? 5_000 * (etat.essais ?? 1) : 0)) {
    // Chaîne volontairement arrêtée : la reprise suivante attendra la fin du délai BAIL_MS.
    etat.maj = new Date(Date.now() - BAIL_MS).toISOString();
    await up(`${jour}/_etat.json`, etat);
  }
  return json({ ok: true, en_cours: true, i: etat.i, from: etat.from, saut, ...(resultat === "echec" ? { nouvel_essai: true } : {}) });
});

// Rotation : retirer uniquement les dossiers de SAUVEGARDE de plus de 30 jours.
async function rotation(sb: any) {
  try {
    const limite = new Date(Date.now() - RETENTION_JOURS * 86400000).toISOString().slice(0, 10);
    const { data: dossiers } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
    for (const d of dossiers ?? []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.name) || d.name >= limite) continue;
      const noms = TABLES.map(([n]) => n);
      for (const t of [...noms, "_erreurs", ...noms.map((n) => `${REPARATION_DOSSIER}/${n}`), `${REPARATION_DOSSIER}/_erreurs`, ""]) {
        const prefix = t ? `${d.name}/${t}` : d.name;
        const { data: files } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
        const paths = (files ?? []).filter((f: any) => f.id).map((f: any) => `${prefix}/${f.name}`);
        if (paths.length) await sb.storage.from(BUCKET).remove(paths);
      }
    }
  } catch (e) { console.error("[rotation]", e); }
}
