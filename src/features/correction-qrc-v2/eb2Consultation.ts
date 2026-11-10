// EB2 VTC — copies historiques sans fiche V2, dans la même grille du correcteur V2.
// Lecture : projection pure, aucune copie créée. Notation : uniquement via la fonction
// serveur qrc_historique_noter (copie originale verrouillée, preuve du score, journal
// append-only) ; une QRC déjà validée n'est jamais réécrite.
import { supabase } from "@/integrations/supabase/client";
import { EXAMENS_BLANCS_VTC } from "@/components/cours-en-ligne/examens-blancs-data";
import type { QrcReelle, ResultatReel, SessionReelle, TentativeReelle } from "@/features/correction-qrc-v2/noyauReel";
import { isQrcCorrectionValidated } from "@/components/cours-en-ligne/exam-helpers";
import { noteExamenAffichee } from "@/lib/noteExamenAffichee";

export const PREFIXE_CONSULTATION = "consultation:";
export const MARQUEUR_CORRECTION_HISTORIQUE = "correction historique importée";
export const estConsultation = (id: string | null | undefined) => String(id ?? "").startsWith(PREFIXE_CONSULTATION);

export type ResultatEb2 = {
  id: string;
  apprenant_id: string;
  quiz_id: string;
  matiere_id: string;
  matiere_nom?: string | null;
  tentative: number | null;
  completed_at: string | null;
  score_obtenu?: number | null;
  score_max?: number | null;
  note_sur_20?: number | null;
  details: any;
};

/**
 * `liaison_a_prouver` : client only — the submission key carries the attempt (`__tN`) while the legacy tentative
 * column kept its default 1; never gradable before the server answers `liaison_prouvee` (append-only proof row
 * re-verified live). No other attempt mismatch is tolerated.
 */
export type ProvenanceRemise = "remise_identique" | "remise_horodatage_divergent" | "resultat_seul" | "liaison_a_prouver" | "liaison_prouvee";

/** Infos de notation d'une copie historique (identité serveur = result_id + question_id). */
export type InfosHistorique = {
  result_id: string;
  score_obtenu: number | null;
  provenance: ProvenanceRemise;
  /** Permuted QCM choices require the prepared server comparator, not the old recognition fallback. */
  preuveServeurRequise?: boolean;
  seuil: number | null;
};

export type PreuveRemise = {
  apprenant_id: string;
  exercice_id: string;
  tentative: number | null;
  completed: boolean | null;
  status: string | null;
  submitted_at: string | null;
  reponses: unknown;
};

function memeJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => memeJson(v, b[i]));
  }
  const g = a as Record<string, unknown>, d = b as Record<string, unknown>;
  const k = Object.keys(g);
  return k.length === Object.keys(d).length && k.every((x) => Object.prototype.hasOwnProperty.call(d, x) && memeJson(g[x], d[x]));
}

/** Checkbox order is not an answer change. All QRC text and the complete key set stay exact. */
export function memesReponsesRemise(r: ResultatEb2, reponses: unknown): boolean {
  const source = r.details?.reponses;
  if (!source || !reponses || typeof source !== "object" || typeof reponses !== "object" || Array.isArray(source) || Array.isArray(reponses)) return false;
  const left = source as Record<string, unknown>, right = reponses as Record<string, unknown>;
  const keys = Object.keys(left);
  if (!keys.length || keys.length !== Object.keys(right).length || keys.some(k => !Object.prototype.hasOwnProperty.call(right, k))) return false;
  const questions = r.details?.snapshot?.questions;
  return keys.every(id => {
    const a = left[id], b = right[id];
    if (memeJson(a, b)) return true;
    if (!Array.isArray(questions)) return false;
    const qs = questions.filter((q: any) => String(q?.id ?? q?.questionId) === id);
    if (qs.length !== 1 || String(qs[0].type).toUpperCase() !== "QCM") return false;
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return false;
    if (!a.every(v => typeof v === "string" && /^[A-E]$/.test(v)) || !b.every(v => typeof v === "string" && /^[A-E]$/.test(v))) return false;
    if (new Set(a).size !== a.length || new Set(b).size !== b.length) return false;
    return memeJson([...a].sort(), [...b].sort());
  });
}

export const exerciceIdEb2 = (r: Pick<ResultatEb2, "matiere_id" | "tentative">) =>
  `EB2__${r.matiere_id}${(r.tentative ?? 1) <= 1 ? "" : `__t${r.tentative}`}`;

/** Remise prouvée uniquement par la fiche exacte : même élève, exercice, tentative, statut remis et mêmes réponses. */
export function remiseProuvee(r: ResultatEb2, preuves: PreuveRemise[]): boolean {
  const exo = exerciceIdEb2(r);
  return preuves.some((p) => p.apprenant_id === r.apprenant_id && p.exercice_id === exo
    && (p.tentative ?? 1) === (r.tentative ?? 1) && p.completed === true && p.status === "submitted"
    && p.submitted_at != null && memesReponsesRemise(r, p.reponses));
}

/** Seule remise de l'exercice suffixé `__tN` (N = tentative du résultat), colonne tentative restée à 1, mêmes réponses. */
export function remiseSuffixeCandidate(r: ResultatEb2, preuves: PreuveRemise[]): boolean {
  if ((r.tentative ?? 1) <= 1) return false;
  const exo = exerciceIdEb2(r);
  const toutes = preuves.filter((p) => p.apprenant_id === r.apprenant_id && p.exercice_id === exo);
  return toutes.length === 1 && (toutes[0].tentative ?? 1) === 1 && toutes[0].completed === true
    && toutes[0].status === "submitted" && toutes[0].submitted_at != null && memesReponsesRemise(r, toutes[0].reponses);
}

/** Même règle que le serveur : réponses identiques ET même instant = remise identique. */
export function provenanceRemise(r: ResultatEb2, preuves: PreuveRemise[]): ProvenanceRemise {
  const exo = exerciceIdEb2(r);
  const memes = preuves.filter((p) => p.apprenant_id === r.apprenant_id && p.exercice_id === exo
    && (p.tentative ?? 1) === (r.tentative ?? 1) && p.completed === true && p.status === "submitted"
    && p.submitted_at != null && memesReponsesRemise(r, p.reponses));
  if (!memes.length) return remiseSuffixeCandidate(r, preuves) ? "liaison_a_prouver" : "resultat_seul";
  const t = r.completed_at ? Date.parse(r.completed_at) : NaN;
  return memes.some((p) => Date.parse(String(p.submitted_at)) === t) ? "remise_identique" : "remise_horodatage_divergent";
}

const matieresEb2 = () => {
  const eb = EXAMENS_BLANCS_VTC.find((e) => e.id === "EB2");
  return (eb?.matieres ?? []).map((m, i) => ({ subject_id: m.id, lettre: String.fromCharCode(65 + i), titre: m.nom, ordre: i }));
};

/** Projection pure d'un résultat EB2 vers la forme V2 (tentative + QRC). Jamais de note inventée. */
export function projeterResultatEb2(r: ResultatEb2, candidat: string, remise: boolean, provenance: ProvenanceRemise = remise ? "remise_identique" : "resultat_seul"): { tentative: TentativeReelle & { historique: InfosHistorique }; qrc: QrcReelle[] } {
  const attemptId = `${PREFIXE_CONSULTATION}${r.id}`;
  const det = r.details ?? {};
  const questionsSrc: any[] = det.snapshot?.questions ?? det.questions ?? [];
  const ref = matieresEb2();
  const mat = ref.find((m) => m.subject_id === r.matiere_id)
    ?? { subject_id: r.matiere_id, lettre: "?", titre: r.matiere_nom ?? r.matiere_id, ordre: 99 };
  const qrcSrc = questionsSrc.filter((q) => String(q?.type ?? "").toUpperCase() === "QRC");
  const enAttente = det.qrc_pending_correction === true;
  const corrections = (det.correctionsIA ?? {}) as Record<string, any>;
  const seuilCfg = (EXAMENS_BLANCS_VTC.find((e) => e.id === "EB2")?.matieres ?? []).find((m) => m.id === r.matiere_id)?.noteEliminatoire;
  const tentative: TentativeReelle & { historique: InfosHistorique } = {
    historique: {
      result_id: r.id,
      score_obtenu: typeof r.score_obtenu === "number" ? r.score_obtenu : r.score_obtenu == null ? null : Number(r.score_obtenu),
      provenance,
      seuil: typeof seuilCfg === "number" ? seuilCfg : null,
    },
    attempt_id: attemptId,
    apprenant_id: r.apprenant_id,
    exam_id: "EB2",
    exam_version_id: "consultation",
    etat: remise ? "terminee" : "remise_non_certifiee",
    snapshot: {
      exam_id: "EB2",
      matieres: [mat],
      questions: qrcSrc.map((q) => ({
        id: String(q.id), matiere: mat.subject_id, type: "QRC",
        enonce: String(q.enonce ?? ""), reponseQRC: q.reponseQRC ?? undefined,
        points: typeof q.points === "number" ? q.points : (null as unknown as number),
      })),
    },
    snapshot_fingerprint: "consultation",
    candidat,
    started_at: r.completed_at,
    finished_at: r.completed_at,
  };
  const qrc: QrcReelle[] = qrcSrc.map((q) => {
    const c = corrections[String(q.id)];
    const note = c?.pointsObtenus;
    // Corrigée si validée par un formateur (même règle que carte/CRM/élève), ou copie non marquée
    // « en attente » avec une note historique. Une proposition IA en attente n'est jamais une note.
    const validee = isQrcCorrectionValidated(c) && typeof note === "number";
    const corrigee = validee || (!enAttente && typeof note === "number");
    return {
      qrc_instance_id: `${attemptId}:${q.id}`,
      attempt_id: attemptId,
      question_id: String(q.id),
      apprenant_id: r.apprenant_id,
      reponse: det.reponses?.[String(q.id)] ?? null,
      etat: corrigee ? "corrigee" : "en_attente",
      note: corrigee && typeof note === "number" ? note : null,
      corrige_email: validee ? "formateur (copie historique)" : corrigee ? MARQUEUR_CORRECTION_HISTORIQUE : null,
      corrige_at: validee ? (c?.correctedAt ?? null) : null,
    };
  });
  return { tentative, qrc };
}

/** Display-only result of this original copy, never a new V2 result or a QRC-only sum. */
export function projeterNoteHistoriqueEb2(r: ResultatEb2, qrc: QrcReelle[]): ResultatReel | null {
  if (r.quiz_id !== "EB2" || !r.completed_at) return null;
  const note = noteExamenAffichee({ ...r, quiz_type: "examen_blanc", __core: null });
  const restantes = qrc.filter((q) => q.etat !== "corrigee").length;
  // An unresolved correction or a missing score is never promoted to a definitive note.
  return {
    result_id: r.id,
    attempt_id: `${PREFIXE_CONSULTATION}${r.id}`,
    result_revision: 0,
    status: note.etat === "note" && restantes === 0 ? "definitif" : "provisoire",
    score: note.etat === "note" && restantes === 0 ? note.note20 : null,
    total: r.score_max ?? null,
    qrc_restantes: restantes,
    published_at: note.etat === "note" && restantes === 0 ? r.completed_at : null,
  };
}

/** Résultats EB2 VTC exacts (jamais EB2-TAXI) sans fiche V2 liée. Lecture paginée complète, erreur = échec. */
export async function lirePassagesEb2Consultation(): Promise<Array<{ id: string; apprenant_id: string; quiz_id: string; completed_at: string }>> {
  const lies = new Set<string>();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await (supabase as any)
      .from("exam_attempts_v2")
      .select("rid:snapshot->source_historique->>result_id")
      .eq("exam_id", "EB2")
      .order("attempt_id", { ascending: true })
      .range(de, de + 999);
    if (error) throw error;
    (data ?? []).forEach((r: any) => { if (r.rid) lies.add(String(r.rid)); });
    if ((data ?? []).length < 1000) break;
  }
  const out: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("apprenant_quiz_results")
      .select("id, apprenant_id, quiz_id, completed_at")
      .eq("quiz_type", "examen_blanc")
      .eq("quiz_id", "EB2")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) throw error;
    out.push(...(data ?? []).filter((r: any) => !lies.has(String(r.id))));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

/** Charge les copies EB2 en consultation (ids `consultation:<result_id>`) au format de la grille V2. */
export async function chargerConsultationEb2(attemptIds: string[]): Promise<SessionReelle> {
  const ids = attemptIds.filter(estConsultation).map((a) => a.slice(PREFIXE_CONSULTATION.length));
  const vide: SessionReelle = { tentatives: [], qrc: [], resultats: [], baremesRestaures: [] };
  if (!ids.length) return vide;
  const lignes: ResultatEb2[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase
      .from("apprenant_quiz_results")
      .select("id, apprenant_id, quiz_id, matiere_id, matiere_nom, tentative, completed_at, score_obtenu, score_max, note_sur_20, details")
      .in("id", ids.slice(i, i + 100))
      .eq("quiz_id", "EB2");
    if (error) throw error;
    lignes.push(...((data ?? []) as any[]));
  }
  const eleves = Array.from(new Set(lignes.map((l) => l.apprenant_id)));
  const noms = new Map<string, string>();
  const preuves: PreuveRemise[] = [];
  for (let i = 0; i < eleves.length; i += 100) {
    const lot = eleves.slice(i, i + 100);
    const { data: a, error: ea } = await supabase.from("apprenants").select("id, nom, prenom").in("id", lot);
    if (ea) throw ea;
    (a ?? []).forEach((x: any) => noms.set(x.id, `${x.nom} ${x.prenom}`));
    const exos = Array.from(new Set(lignes.filter((l) => lot.includes(l.apprenant_id)).map(exerciceIdEb2)));
    for (let de = 0; ; de += 1000) {
      const { data: p, error: ep } = await supabase
        .from("reponses_apprenants")
        .select("apprenant_id, exercice_id, tentative, completed, status, submitted_at, reponses")
        .in("apprenant_id", lot)
        .in("exercice_id", exos)
        .order("id", { ascending: true })
        .range(de, de + 999);
      if (ep) throw ep;
      preuves.push(...((p ?? []) as any[]));
      if ((p ?? []).length < 1000) break;
    }
  }
  for (const l of lignes) {
    const provenance = provenanceRemise(l, preuves);
    const { tentative, qrc } = projeterResultatEb2(l, noms.get(l.apprenant_id) ?? "(apprenant)", remiseProuvee(l, preuves), provenance);
    tentative.historique.preuveServeurRequise = provenance === "liaison_a_prouver" || provenance !== "resultat_seul" && !preuves.some(p => p.apprenant_id === l.apprenant_id
      && p.exercice_id === exerciceIdEb2(l) && (p.tentative ?? 1) === (l.tentative ?? 1) && p.completed === true && p.status === "submitted"
      && p.submitted_at != null && memeJson(p.reponses, l.details?.reponses));
    if (!qrc.length) continue;
    vide.tentatives.push(tentative);
    vide.qrc.push(...qrc);
    const resultat = projeterNoteHistoriqueEb2(l, qrc);
    if (resultat) vide.resultats.push(resultat);
  }
  vide.tentatives.sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)));
  return vide;
}

/** Fail closed until the prepared server rule is actually installed. Never use recognition to bypass it. */
export async function verifierLiaisonHistoriqueServeur(resultId: string, apprenantId: string): Promise<ProvenanceRemise> {
  const { data, error } = await (supabase as any).rpc("qrc_historique_preuve_remise", { p_result_id: resultId });
  if (error) throw new Error("Note non enregistrée : réparation serveur de liaison non disponible ou vérification refusée ; aucune note n’a été attribuée.");
  if (!data || data.result_id !== resultId || data.apprenant_id !== apprenantId
    || !["remise_identique", "remise_horodatage_divergent", "liaison_prouvee"].includes(data.provenance)) {
    throw new Error("Note non enregistrée : remise non prouvée par le serveur ; aucune confirmation manuelle ne peut la remplacer.");
  }
  return data.provenance;
}

/** Notation admin d'une QRC de copie historique : écriture serveur unique, idempotente, tracée. */
export async function noterQrcHistorique(params: {
  operationId: string;
  resultId: string;
  questionId: string;
  note: number;
  scoreAttendu: number;
  seuil: number | null;
  commentaire?: string;
  reconnaissance?: string | null;
}) {
  const { data, error } = await (supabase as any).rpc("qrc_historique_noter", {
    p_operation_id: params.operationId,
    p_result_id: params.resultId,
    p_question_id: params.questionId,
    p_note: params.note,
    p_score_attendu: params.scoreAttendu,
    p_seuil: params.seuil,
    p_commentaire: params.commentaire ?? "",
    p_reconnaissance: params.reconnaissance ?? null,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

/** Révision append-only d'une QRC historique déjà notée (« Modifier la note »), refusée si la note a changé depuis l'affichage. */
export async function reviserQrcHistorique(params: {
  operationId: string;
  resultId: string;
  questionId: string;
  note: number;
  noteAttendue: number;
  scoreAttendu: number;
  seuil: number | null;
  commentaire?: string;
  reconnaissance?: string | null;
}) {
  const { data, error } = await (supabase as any).rpc("qrc_historique_reviser", {
    p_operation_id: params.operationId,
    p_result_id: params.resultId,
    p_question_id: params.questionId,
    p_note: params.note,
    p_note_attendue: params.noteAttendue,
    p_score_attendu: params.scoreAttendu,
    p_seuil: params.seuil,
    p_commentaire: params.commentaire ?? "",
    p_reconnaissance: params.reconnaissance ?? null,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

/**
 * Trace de remise envoyée avec la note. Identité prouvée (élève + exercice + tentative + réponses identiques) :
 * vérification automatique, sans case. Aucune fiche identique : refus, jamais d'attestation humaine inventée.
 */
export function reconnaissanceRemise(provenance: ProvenanceRemise, resultId: string, questionId: string): string | null {
  if (provenance === "remise_identique") return null;
  if (provenance === "liaison_prouvee") {
    return `Vérification automatique : preuve serveur de liaison enregistrée (remise suffixée de la tentative, réponses identiques) — copie ${resultId}, question ${questionId}.`;
  }
  if (provenance === "remise_horodatage_divergent") {
    return `Vérification automatique : fiche remise de l'élève aux réponses identiques (élève, exercice, tentative), horodatage différent — copie ${resultId}, question ${questionId}.`;
  }
  throw new Error("Note non enregistrée : aucune remise correspondant à cet élève, cette matière, cette tentative et ces réponses n’est prouvée. La liaison de cette copie doit être vérifiée ; aucune note n’a été attribuée.");
}

/** Historique des corrections d'une QRC historique (journal append-only), au format de l'historique V2. */
export async function lireHistoriqueQrcHistorique(resultId: string, questionId: string) {
  const { data, error } = await (supabase as any)
    .from("qrc_historique_corrections")
    .select("note, note_precedente, created_at, acteur, revision")
    .eq("result_id", resultId).eq("question_id", questionId)
    .order("revision", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<{ note: number; note_precedente: number | null; created_at: string }>).map((h) => ({
    note_precedente: h.note_precedente, note_nouvelle: h.note, created_at: h.created_at, corrige_email: "administrateur (journal tracé)" as string | null, etat_precedent: null, etat_nouveau: "corrigee",
  }));
}
