/**
 * Preuves individuelles du « Relevé des jalons pédagogiques » — LECTURE SEULE.
 * Réutilise les règles du relevé de connexions (fin d'accès, plafond 7 h,
 * tolérance 30 min, exclusion de l'accueil, début de calcul spécifique) et la
 * pagination fetchAllRows. Aucune écriture, aucun recalcul d'heures, de taux,
 * de poids, de progression ou de note. Une source illisible (RLS, réseau) est
 * signalée « lecture non possible », jamais confondue avec 0 trace.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { clampConnexionsToAccessEnd, getAccessCutoffMs } from "@/lib/reports/session-duration";
import { learningSessionWindow } from "@/lib/reports/learning-hours-window";
import { fetchPratiqueSlotDetails, type PratiqueSlotDetail } from "@/lib/pratiqueSlots";
import { isSignedPresentielRow } from "@/lib/presentielHours";
import { EXAMENS_BLANCS_FILIERE, INTRO_IDS, PRATIQUE_PHYSIQUE, type Filiere } from "@/lib/jalonsPonderes";

export const VERSION_METHODE_PREUVES = "preuves-jalons v1 — 12/10/2026";

export interface SourceLecture { cle: string; libelle: string; lu: boolean; lignes: number; erreur?: string }
export interface TracePreuve {
  ref: string; date: string; dateSeule?: boolean; source: string; type: string; detail: string;
  moduleId: number | null; motifNonRattache?: string; horsPeriode?: boolean;
}
export interface SyntheseJalon {
  moduleId: number; statutEnregistre: string; ouvertures: number; exercicesAvecReponses: number;
  matieresEnvoyees: number; passagesV2Termines: number; notes: number; emargements: number; premiere: string | null; derniere: string | null;
  traces: "disponibles" | "manquantes" | "lecture non possible"; commentaire: string;
}
export interface ConnexionRetenue { date: string; minutesRetenues: number; comptee: boolean; motif: string }
export interface PreuvesJalons {
  version: string; sources: SourceLecture[]; synthese: SyntheseJalon[]; chronologie: TracePreuve[];
  nonRattachees: TracePreuve[]; connexions: ConnexionRetenue[]; minutesConnexionRetenues: number;
}

export interface EntreesPreuves {
  apprenantId: string; filiere: Filiere; lignesModuleIds: number[];
  completions: Array<{ module_id: number; status?: string | null; completed_at?: string | null }>;
  dateFinAcces?: string | null; dateDebutAcces?: string | null;
  activites?: any[] | null; reponses?: any[] | null; quiz?: any[] | null; tentativesV2?: any[] | null;
  connexions?: any[] | null; emargements?: any[] | null; pratiqueDetails?: PratiqueSlotDetail[] | null;
  heuresValidees?: any[] | null;
  sources: SourceLecture[];
}

const isAccueil = (s?: string | null) => !!s && /accueil|liste\s+des\s+modules/i.test(s);
const OUVERTURES = new Set(["open_module", "open_cours", "open_section"]);
const ms = (v?: string | null) => (v ? Date.parse(v) : NaN);

/** Réponse réellement saisie : au moins une valeur non vide (contenu jamais recopié). */
export function reponseNonVide(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(reponseNonVide);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(reponseNonVide);
  return false;
}

/** Module identifié uniquement par identifiant technique, jamais par libellé. */
export function moduleDepuisExercice(exerciceId: string, filiere: Filiere): number | null {
  const m = /^module_(\d+)_(?:revision_)?(?:exo|inline)_\d+$/.exec(exerciceId || "");
  if (m) return Number(m[1]);
  if (/^eb\d/i.test(exerciceId || "")) return EXAMENS_BLANCS_FILIERE[filiere].moduleId;
  return null;
}

export function construirePreuvesJalons(e: EntreesPreuves): PreuvesJalons {
  const lignes = new Set(e.lignesModuleIds);
  const introLigne = e.lignesModuleIds.find((id) => INTRO_IDS.has(id)) ?? null;
  const ebModule = EXAMENS_BLANCS_FILIERE[e.filiere].moduleId;
  const finMs = getAccessCutoffMs(e.dateFinAcces);
  const debutMs = e.dateDebutAcces ? Date.parse(`${String(e.dateDebutAcces).slice(0, 10)}T00:00:00`) : NaN;
  const hors = (iso: string) => { const t = ms(iso); return (finMs != null && t > finMs) || (Number.isFinite(debutMs) && t < debutMs); };
  const rattacher = (id: number | null): { moduleId: number | null; motif?: string } => {
    if (id == null) return { moduleId: null, motif: "identifiant de module absent" };
    if (INTRO_IDS.has(id) && introLigne != null) return { moduleId: introLigne };
    if (lignes.has(id)) return { moduleId: id };
    return { moduleId: null, motif: `module ${id} hors parcours de la filière` };
  };
  const traces: TracePreuve[] = [];
  const vus = new Set<string>();
  const push = (t: Omit<TracePreuve, "moduleId" | "motifNonRattache" | "horsPeriode">, id: number | null, motifForce?: string) => {
    if (!t.date || !Number.isFinite(ms(t.date)) || vus.has(t.ref)) return;
    vus.add(t.ref);
    const r = motifForce ? { moduleId: null, motif: motifForce } : rattacher(id);
    traces.push({ ...t, moduleId: r.moduleId, motifNonRattache: r.motif, horsPeriode: hors(t.date) });
  };

  for (const a of e.activites ?? []) {
    if (!OUVERTURES.has(a.action_type)) continue;
    const accueil = isAccueil(a.module_nom) || !a.module_id;
    push({ ref: `activite:${a.id}`, date: a.occurred_at, source: "Journal d’activité", type: a.action_type === "open_cours" ? "Ouverture de cours / support" : a.action_type === "open_section" ? "Ouverture de section" : "Ouverture de module", detail: String(a.module_nom ?? "").slice(0, 90) },
      a.module_id ?? null, accueil ? "page d’accueil (exclue des preuves)" : undefined);
  }
  for (const r of e.reponses ?? []) {
    if (!reponseNonVide(r.reponses)) continue;
    const date = r.submitted_at || r.updated_at;
    const exam = /^eb\d/i.test(r.exercice_id || "");
    const statut = r.status || (r.completed ? "completed" : "in_progress");
    push({ ref: `reponse:${r.id}`, date, source: "Réponses enregistrées", type: exam ? (r.submitted_at ? "Épreuve d’examen blanc envoyée" : "Épreuve d’examen blanc commencée") : (r.completed ? "Exercice finalisé (réponses non vides)" : "Exercice commencé (réponses non vides)"), detail: `exercice ${r.exercice_id} · tentative ${r.tentative ?? 1} · statut ${statut}` },
      /^revision_fausses/i.test(r.exercice_id || "") ? null : moduleDepuisExercice(r.exercice_id, e.filiere),
      /^revision_fausses/i.test(r.exercice_id || "") ? "révision des erreurs (non rattachée à un jalon)" : undefined);
  }
  for (const q of e.quiz ?? []) {
    const eb = q.quiz_type === "examen_blanc";
    push({ ref: `quiz:${q.id}`, date: q.completed_at, source: "Résultats de quiz / examens", type: q.note_sur_20 != null ? "Note enregistrée" : "Résultat enregistré sans note", detail: `${q.quiz_id ?? "?"} · ${q.matiere_id ?? "matière ?"}${q.note_sur_20 != null ? ` · ${Number(q.note_sur_20).toLocaleString("fr-FR")}/20` : ""}` },
      eb ? ebModule : null, eb ? undefined : `type ${q.quiz_type ?? "inconnu"} (non rattaché à un jalon)`);
  }
  for (const t of e.tentativesV2 ?? []) {
    if (t.is_test === true) continue;
    push({ ref: `passageV2:${t.attempt_id}`, date: t.finished_at || t.started_at, source: "Passages nouveau moteur", type: t.etat === "terminee" ? "Passage terminé" : t.etat === "abandonnee" ? "Passage abandonné" : "Passage non terminé", detail: `passage ${String(t.attempt_id).slice(0, 8)} · examen ${t.exam_id} · état ${t.etat}` }, ebModule);
  }
  const datesPratique = new Map((e.pratiqueDetails ?? []).map((d) => [d.date, d]));
  for (const row of e.emargements ?? []) {
    const date = String(row.date_emargement || "").slice(0, 10);
    if (!isSignedPresentielRow(row)) continue;
    const pratiqueJour = datesPratique.has(date);
    push({ ref: `emargement:${row.id ?? `${date}:${row.demi_journee}`}`, date: row.signed_at || `${date}T00:00:00`, dateSeule: !row.signed_at, source: pratiqueJour ? "Émargements signés (Planning pratique)" : "Émargements signés (formation présentielle)", type: "Présence physique signée", detail: `${date} · ${row.demi_journee ?? "créneau ?"}${row.signed_at ? "" : " · heure de signature non disponible"}` }, PRATIQUE_PHYSIQUE);
  }
  for (const h of e.heuresValidees ?? []) {
    push({ ref: `heuresValidees:${h.id}`, date: h.created_at, source: "Heures validées par l’administration", type: "Présence validée par l’administration", detail: `${Number(h.heures).toLocaleString("fr-FR")} h · ${h.motif ? String(h.motif).slice(0, 80) : "motif non renseigné"}` }, PRATIQUE_PHYSIQUE);
  }
  traces.sort((a, b) => ms(a.date) - ms(b.date) || a.ref.localeCompare(b.ref));

  // Connexions : même calcul que le relevé de connexions (aucune double addition).
  const pedaTs = [
    ...(e.activites ?? []).filter((a) => OUVERTURES.has(a.action_type) && !isAccueil(a.module_nom)).map((a) => ms(a.occurred_at)),
    ...(e.reponses ?? []).filter((r) => r.completed === true).map((r) => ms(r.updated_at)),
    ...(e.quiz ?? []).map((q) => ms(q.completed_at)),
  ].filter(Number.isFinite).sort((a, b) => a - b);
  const actif = (s: number, f: number) => { let lo = 0, hi = pedaTs.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (pedaTs[m] < s) lo = m + 1; else if (pedaTs[m] > f) hi = m - 1; else return true; } return false; };
  const connexions: ConnexionRetenue[] = [];
  let minutesConnexionRetenues = 0;
  for (const c of clampConnexionsToAccessEnd([...(e.connexions ?? [])], e.dateFinAcces)) {
    if (!c.started_at || !(c.ended_at || c.last_seen_at)) continue;
    const w = learningSessionWindow(c, e.apprenantId, finMs);
    const duree = w.end - w.start;
    if (!Number.isFinite(duree) || duree <= 0) { connexions.push({ date: c.started_at, minutesRetenues: 0, comptee: false, motif: "hors période de calcul" }); continue; }
    const ok = actif(w.start, w.end);
    const minutes = ok ? Math.floor(duree / 60000) : 0;
    minutesConnexionRetenues += minutes;
    connexions.push({ date: c.started_at, minutesRetenues: minutes, comptee: ok, motif: ok ? "activité pédagogique pendant la connexion" : "aucune activité pédagogique (accueil seul)" });
  }
  connexions.sort((a, b) => ms(a.date) - ms(b.date));

  const lu = (cle: string) => e.sources.find((s) => s.cle === cle)?.lu !== false;
  const statutDe = new Map(e.completions.map((c) => [Number(c.module_id), c]));
  const synthese: SyntheseJalon[] = e.lignesModuleIds.map((moduleId) => {
    const t = traces.filter((x) => x.moduleId === moduleId && !x.horsPeriode);
    const c = statutDe.get(moduleId);
    const pratique = moduleId === PRATIQUE_PHYSIQUE;
    const sourcesUtiles = pratique ? ["emargements", "planning", "heuresValidees"] : ["activites", "reponses", ...(moduleId === ebModule ? ["quiz", "v2"] : [])];
    const illisible = sourcesUtiles.some((s) => !lu(s));
    const count = (pred: (x: TracePreuve) => boolean) => t.filter(pred).length;
    return {
      moduleId,
      statutEnregistre: pratique ? "calculé depuis les émargements signés et les heures validées par l’administration" : c?.status ? String(c.status) : "aucun statut enregistré",
      ouvertures: count((x) => x.source === "Journal d’activité"),
      exercicesAvecReponses: count((x) => x.source === "Réponses enregistrées" && !x.type.startsWith("Épreuve")),
      matieresEnvoyees: count((x) => x.type === "Épreuve d’examen blanc envoyée"),
      passagesV2Termines: count((x) => x.type === "Passage terminé"),
      notes: count((x) => x.type === "Note enregistrée"),
      emargements: count((x) => x.source.startsWith("Émargements") || x.source.startsWith("Heures validées")),
      premiere: t[0]?.date ?? null,
      derniere: t.at(-1)?.date ?? null,
      traces: t.length ? "disponibles" : illisible ? "lecture non possible" : "manquantes",
      commentaire: t.length
        ? "Traces partielles : une ouverture ou une réponse ne prouve pas la réalisation intégrale du module."
        : traces.some((x) => x.moduleId === moduleId) ? "Traces uniquement hors période d’accès (visibles en annexe, non comptées)."
        : illisible ? "Une source n’a pas pu être lue : absence de trace non démontrée."
        : pratique ? "Aucune présence signée ni validée par l’administration : une inscription au planning n’est pas une présence."
        : c?.status === "completed" ? "Statut enregistré sans trace individuelle retrouvée dans les sources consultées (statut conservé tel quel)." : "Aucune trace retrouvée dans les sources consultées.",
    };
  });

  return {
    version: VERSION_METHODE_PREUVES, sources: e.sources, synthese,
    chronologie: traces.filter((x) => x.moduleId !== null),
    nonRattachees: traces.filter((x) => x.moduleId === null),
    connexions, minutesConnexionRetenues,
  };
}

async function lire<T>(sources: SourceLecture[], cle: string, libelle: string, run: () => Promise<T[]>): Promise<T[] | null> {
  try { const rows = await run(); sources.push({ cle, libelle, lu: true, lignes: rows.length }); return rows; }
  catch (err: any) { sources.push({ cle, libelle, lu: false, lignes: 0, erreur: err?.code ? `${err.code}` : "lecture refusée ou indisponible" }); return null; }
}

/** Lecture paginée et stable de toutes les sources (admin uniquement, lecture seule). */
export async function chargerPreuvesJalons(p: {
  apprenant: any; filiere: Filiere; lignesModuleIds: number[]; completions: EntreesPreuves["completions"];
}): Promise<PreuvesJalons> {
  const id = p.apprenant.id as string;
  const sources: SourceLecture[] = [];
  const page = (table: string, cols: string, order: string) => () => fetchAllRows<any>((from, to) =>
    (supabase.from(table as any) as any).select(cols).eq("apprenant_id", id).order(order, { ascending: true }).range(from, to));
  const [activites, reponses, quiz, tentativesV2, connexions, emargements, pratiqueDetails, heuresValidees] = await Promise.all([
    lire(sources, "activites", "Journal d’activité", page("apprenant_module_activites", "id, module_id, module_nom, action_type, occurred_at", "id")),
    lire(sources, "reponses", "Réponses enregistrées", page("reponses_apprenants", "id, exercice_id, reponses, completed, status, tentative, submitted_at, updated_at", "id")),
    lire(sources, "quiz", "Résultats de quiz / examens", page("apprenant_quiz_results", "id, quiz_type, quiz_id, matiere_id, note_sur_20, completed_at", "id")),
    lire(sources, "v2", "Passages nouveau moteur", page("exam_attempts_v2", "attempt_id, exam_id, etat, is_test, started_at, finished_at", "attempt_id")),
    lire(sources, "connexions", "Connexions", page("apprenant_connexions", "id, started_at, ended_at, last_seen_at, last_action_at", "id")),
    lire(sources, "emargements", "Émargements", () => fetchAllRows<any>((from, to) => (supabase.from("emargements_fc" as any) as any)
      .select("id, date_emargement, demi_journee, absent, signature_data_url, masque, signed_at").eq("apprenant_id", id).eq("masque", false).order("id", { ascending: true }).range(from, to))),
    lire(sources, "planning", "Planning pratique", () => fetchPratiqueSlotDetails(id)),
    lire(sources, "heuresValidees", "Heures validées par l’administration", page("presentiel_heures_validees", "id, heures, motif, created_at", "id")),
  ]);
  return construirePreuvesJalons({
    apprenantId: id, filiere: p.filiere, lignesModuleIds: p.lignesModuleIds, completions: p.completions,
    dateFinAcces: p.apprenant.date_fin_cours_en_ligne || p.apprenant.date_fin_formation,
    dateDebutAcces: p.apprenant.date_debut_cours_en_ligne || p.apprenant.date_debut_formation,
    activites, reponses, quiz, tentativesV2, connexions, emargements, pratiqueDetails, heuresValidees, sources,
  });
}
