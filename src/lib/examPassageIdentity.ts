/**
 * IDENTITÉ CANONIQUE D'UN PASSAGE D'EXAMEN BLANC — RÈGLE UNIQUE DU PROJET.
 *
 * Toutes les pages (Correction QRC, résultats élève, récapitulatif, calcul de
 * note, CRM, réinitialisation) doivent utiliser CE module pour identifier :
 *
 *   apprenant + filière (quiz_type) + examen (quiz_id) + matière (matiere_id)
 *   + passage réel + identité stable de la question
 *
 * Aucune donnée n'est modifiée ici : lecture, regroupement et classement
 * uniquement. Les écritures techniques en double restent en base ; c'est leur
 * IDENTIFICATION LOGIQUE qui est fiabilisée.
 */
import {
  MEME_PASSAGE_MS,
  isQrcCorrectionValidated,
  isQrcAnswerCertainlyEmpty,
  isResultPlaceholder,
} from "@/components/cours-en-ligne/exam-helpers";

/** Fenêtre technique : deux écritures du même passage réel. */
export const PASSAGE_WINDOW_MS = MEME_PASSAGE_MS;

export type QrcState = "validated" | "to_correct" | "empty";

export interface PassageRowLike {
  id?: string;
  apprenant_id?: string;
  quiz_id?: string;
  quiz_type?: string;
  matiere_id?: string;
  matiere_nom?: string;
  tentative?: number | string | null;
  completed_at?: string | null;
  created_at?: string | null;
  score_obtenu?: number | null;
  score_max?: number | null;
  details?: any;
}

export interface CanonicalPassage {
  /** Clé stable du passage réel : apprenant + filière + examen + matière + n° de passage. */
  key: string;
  apprenantId: string;
  quizType: string;
  quizId: string;
  matiereId: string;
  matiereNom: string;
  /** Numéro de passage réel (1, 2, 3…), indépendant des doublons techniques. */
  passage: number;
  /** Numéro de tentative écrit en base sur la première ligne du passage. */
  dbTentative: number;
  completedAt: string | null;
  firstTime: number;
  lastTime: number;
  /** Toutes les écritures techniques du passage (jamais fusionnées en base). */
  rows: PassageRowLike[];
  /** Snapshot des questions le plus complet du passage. */
  questions: any[] | null;
  reponses: Record<string, any>;
  corrections: Record<string, any>;
}

const toTime = (row: PassageRowLike): number =>
  new Date(row?.completed_at || row?.created_at || 0).getTime() || 0;

const isBlank = (value: unknown): boolean => {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0 || value.every((v) => String(v ?? "").trim() === "");
  return String(value).trim() === "";
};

const snapshotQuestions = (details: any): any[] | null => {
  if (Array.isArray(details?.questions) && details.questions.length) return details.questions;
  if (Array.isArray(details?.snapshot?.questions) && details.snapshot.questions.length) return details.snapshot.questions;
  return null;
};

/** Identité « matière » d'un passage, insensible aux suffixes techniques (`gestion__t3`). */
export function normalizeMatiereId(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/__t\d+$/i, "");
}

/** Clé d'identité du groupe de passages : apprenant + filière + examen + matière. */
export function buildMatiereIdentity(row: PassageRowLike): string {
  return [
    String(row?.apprenant_id ?? ""),
    String(row?.quiz_type ?? ""),
    String(row?.quiz_id ?? ""),
    normalizeMatiereId(row?.matiere_id),
  ].join("|");
}

/** Clé d'identité stable d'une QRC : passage réel + identité de la question. */
export function buildQrcIdentity(passage: CanonicalPassage, questionId: unknown): string {
  return `${passage.key}|Q${String(questionId)}`;
}

/**
 * Regroupe les lignes `apprenant_quiz_results` en PASSAGES RÉELS.
 * Les lignes écrites à moins de PASSAGE_WINDOW_MS d'intervalle pour la même
 * identité (apprenant + filière + examen + matière) sont un seul passage,
 * même si leur numéro de tentative diffère.
 */
export function groupPassages(rows: PassageRowLike[] | null | undefined): CanonicalPassage[] {
  const list = (rows || []).filter((r) => r && !isResultPlaceholder(r));
  const asc = [...list].sort((a, b) => toTime(a) - toTime(b));
  const byIdentity = new Map<string, CanonicalPassage[]>();

  for (const row of asc) {
    const identity = buildMatiereIdentity(row);
    const time = toTime(row);
    const groups = byIdentity.get(identity) || [];
    let target = groups[groups.length - 1];

    if (!target || time - target.lastTime > PASSAGE_WINDOW_MS) {
      target = {
        key: `${identity}|P${groups.length + 1}`,
        apprenantId: String(row?.apprenant_id ?? ""),
        quizType: String(row?.quiz_type ?? ""),
        quizId: String(row?.quiz_id ?? ""),
        matiereId: normalizeMatiereId(row?.matiere_id),
        matiereNom: String(row?.matiere_nom ?? ""),
        passage: groups.length + 1,
        dbTentative: Math.max(1, Math.floor(Number(row?.tentative) || 1)),
        completedAt: row?.completed_at ?? row?.created_at ?? null,
        firstTime: time,
        lastTime: time,
        rows: [],
        questions: null,
        reponses: {},
        corrections: {},
      };
      groups.push(target);
      byIdentity.set(identity, groups);
    }

    const details = row?.details || {};
    target.lastTime = time;
    target.rows.push(row);
    if (row?.completed_at) target.completedAt = row.completed_at;
    if (!target.matiereNom && row?.matiere_nom) target.matiereNom = String(row.matiere_nom);

    const snap = snapshotQuestions(details);
    if (snap && (!target.questions || snap.length > target.questions.length)) target.questions = snap;

    Object.entries(details.reponses || {}).forEach(([k, v]) => {
      if (isBlank(target.reponses[k]) && !isBlank(v)) target.reponses[k] = v;
    });
    Object.entries(details.correctionsIA || {}).forEach(([k, v]) => {
      const current = target.corrections[k];
      // Une correction manuelle déjà présente n'est JAMAIS remplacée par une
      // correction automatique plus récente.
      if (current == null || (!isQrcCorrectionValidated(current) && isQrcCorrectionValidated(v))) {
        target.corrections[k] = v;
      }
    });
  }

  const all: CanonicalPassage[] = [];
  byIdentity.forEach((groups) => all.push(...groups));
  return all;
}

/** Détails fusionnés d'un passage (lecture seule) — même vue pour tous les écrans. */
export function passageDetails(passage: CanonicalPassage): any {
  const base = passage.rows.find((r) => snapshotQuestions(r?.details))?.details || passage.rows[0]?.details || {};
  return {
    ...base,
    questions: passage.questions ?? base?.questions ?? [],
    reponses: { ...(base?.reponses || {}), ...passage.reponses },
    correctionsIA: { ...(base?.correctionsIA || {}), ...passage.corrections },
  };
}

const correctionFor = (corrections: Record<string, any>, questionId: unknown) =>
  corrections?.[questionId as any] ?? corrections?.[String(questionId)] ?? corrections?.[`Q${String(questionId)}`];

/** Identifiants des QRC réellement passées, lus dans le snapshot du passage. */
export function getPassageQrcIds(passage: CanonicalPassage): string[] {
  const questions = passage.questions || [];
  return Array.from(
    new Set(
      questions
        .filter((q: any) => {
          const type = q?.type
            ? String(q.type).trim().toUpperCase()
            : (/\(qrc\)/i.test(String(q?.enonce ?? "")) ? "QRC" : "QCM");
          return type === "QRC";
        })
        .map((q: any) => String(q?.questionId ?? q?.id))
        .filter((id: string) => id && id !== "undefined"),
    ),
  );
}

/**
 * ÉTAT D'UNE QRC — règle unique élève / formateur.
 * - `validated`  : correction manuelle existante (sur n'importe quelle écriture sœur) → n'apparaît jamais dans la file.
 * - `empty`      : réponse certainement vide au moment de la remise → 0 point, non bloquante, hors file.
 * - `to_correct` : réponse enregistrée sans validation manuelle → exactement 1 apparition dans la file, bloque la note.
 */
export function getQrcState(passage: CanonicalPassage, questionId: unknown): QrcState {
  const details = passageDetails(passage);
  if (isQrcCorrectionValidated(correctionFor(passage.corrections, questionId))) return "validated";
  if (isQrcAnswerCertainlyEmpty(details, questionId)) return "empty";
  return "to_correct";
}

/** QRC du passage qui attendent réellement la correction du formateur. */
export function getQrcToCorrect(passage: CanonicalPassage): string[] {
  return getPassageQrcIds(passage).filter((id) => getQrcState(passage, id) === "to_correct");
}

/** Le passage bloque-t-il la publication de la note ? (même règle partout) */
export function isPassagePendingQrc(passage: CanonicalPassage): boolean {
  return getQrcToCorrect(passage).length > 0;
}

/** Dernier passage réel connu pour chaque identité apprenant+filière+examen+matière. */
export function getLatestPassages(passages: CanonicalPassage[]): CanonicalPassage[] {
  const latest = new Map<string, CanonicalPassage>();
  passages.forEach((p) => {
    const identity = p.key.slice(0, p.key.lastIndexOf("|P"));
    const prev = latest.get(identity);
    if (!prev || p.lastTime >= prev.lastTime) latest.set(identity, p);
  });
  return Array.from(latest.values());
}

export interface QrcCoherenceReport {
  passages: number;
  pendingPassages: number;
  qrcToCorrect: number;
  qrcValidated: number;
  qrcEmpty: number;
  /** Passages affichés « En attente » sans aucune QRC réellement à corriger. */
  incoherences: Array<{ passageKey: string; reason: string }>;
}

/**
 * SURVEILLANCE D'INCOHÉRENCE (lecture seule).
 * Détecte les cas « élève en attente / file formateur vide » et l'inverse.
 * Ne corrige jamais une donnée : elle journalise pour diagnostic.
 */
export function auditQrcCoherence(rows: PassageRowLike[] | null | undefined): QrcCoherenceReport {
  const passages = groupPassages(rows);
  const report: QrcCoherenceReport = {
    passages: passages.length,
    pendingPassages: 0,
    qrcToCorrect: 0,
    qrcValidated: 0,
    qrcEmpty: 0,
    incoherences: [],
  };

  for (const p of passages) {
    const ids = getPassageQrcIds(p);
    let toCorrect = 0;
    for (const id of ids) {
      const state = getQrcState(p, id);
      if (state === "to_correct") toCorrect++;
      else if (state === "validated") report.qrcValidated++;
      else report.qrcEmpty++;
    }
    report.qrcToCorrect += toCorrect;
    if (toCorrect > 0) report.pendingPassages++;

    // Drapeau brut posé sur une écriture alors qu'aucune QRC n'attend : ancienne
    // divergence d'affichage. Signalée, jamais corrigée automatiquement.
    const flagged = p.rows.some((r) => r?.details?.qrc_pending_correction === true);
    if (flagged && toCorrect === 0 && ids.length > 0) {
      report.incoherences.push({
        passageKey: p.key,
        reason: "drapeau_en_attente_sans_qrc_a_corriger",
      });
    }
  }

  return report;
}

/** Journalise une incohérence détectée (jamais bloquant, jamais correctif). */
export async function reportQrcIncoherence(report: QrcCoherenceReport, source: string): Promise<void> {
  if (report.incoherences.length === 0) return;
  try {
    const { captureError } = await import("@/lib/monitoring/errorLogger");
    await captureError({
      message: `[QRC][Incohérence] ${report.incoherences.length} passage(s) en attente sans QRC réellement à corriger`,
      level: "warn",
      source,
      context: {
        passages: report.passages,
        pendingPassages: report.pendingPassages,
        qrcToCorrect: report.qrcToCorrect,
        incoherences: report.incoherences.slice(0, 50),
      },
      fingerprint: `qrc_incoherence_${source}`,
    } as any);
  } catch {
    /* le monitoring ne doit jamais bloquer l'application */
  }
}
