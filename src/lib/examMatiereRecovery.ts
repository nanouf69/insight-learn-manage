/**
 * REPRISE D'UNE MATIÈRE APRÈS ÉCHEC DE « TERMINER LA MATIÈRE ».
 *
 * Principe : SAUVEGARDER les réponses et FINALISER la matière sont deux choses
 * distinctes. Si la finalisation échoue (bouton bloqué, réseau coupé, page
 * fermée), les réponses déjà enregistrées suffisent à reconstruire le résultat.
 *
 * Règles strictes :
 *  - les points des questions à correction AUTOMATIQUE (QCM) sont recalculés de
 *    façon déterministe à partir des réponses réellement enregistrées ;
 *  - une QRC conserve sa réponse et son état « à corriger » : aucun point
 *    automatique, aucune correction par mots-clés, aucune validation inventée ;
 *  - aucune note artificielle à 0 : sans aucune réponse enregistrée, la reprise
 *    refuse de créer un résultat ;
 *  - aucune réponse n'est effacée ni modifiée ; la matière n'est jamais
 *    considérée comme vide tant qu'une réponse existe.
 */
import type { Matiere, Question } from "@/components/cours-en-ligne/examens-blancs-data";
import { getPointsParQuestion } from "@/components/cours-en-ligne/examens-blancs-data";
import {
  clamp,
  getCorrectQcmChoices,
  normalizeSelectedChoices,
  normalizeNoteSur20,
  computeAdmisForMatiere,
} from "@/components/cours-en-ligne/examens-blancs-utils";
import { isQrcCorrectionValidated } from "@/components/cours-en-ligne/exam-helpers";

export interface MatiereRecovery {
  /** Un résultat peut-il être reconstruit ? (false = aucune réponse enregistrée) */
  recoverable: boolean;
  /** Nombre de questions ayant une réponse réellement enregistrée. */
  answeredCount: number;
  totalQuestions: number;
  /** Points des questions à correction automatique (QCM), déterministes. */
  qcmPoints: number;
  qcmMax: number;
  /** Points des QRC déjà corrigées manuellement (repris tels quels). */
  qrcManualPoints: number;
  qrcMax: number;
  /** QRC répondues et non encore corrigées : bloquent la note, remontent au formateur. */
  qrcPending: string[];
  /** QRC réellement laissées vides : 0 point, non bloquantes. */
  qrcEmpty: string[];
  scoreObtenu: number;
  scoreMax: number;
  noteSur20: number;
  admis: boolean;
  /** La note est provisoire tant qu'une QRC répondue attend la correction. */
  qrcPendingCorrection: boolean;
  /** Réponses conservées à l'identique (jamais modifiées). */
  reponses: Record<string, any>;
}

const hasAnswer = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.some((v) => String(v ?? "").trim() !== "");
  return String(value).trim() !== "";
};

/**
 * Reconstruit l'état d'une matière à partir des réponses RÉELLEMENT enregistrées.
 * Lecture pure : n'écrit rien et ne modifie aucune réponse ni correction.
 */
export function recoverMatiereFromSavedAnswers(input: {
  matiere: Matiere;
  reponses: Record<string, any> | null | undefined;
  correctionsIA?: Record<string, any> | null;
}): MatiereRecovery {
  const questions = (input.matiere?.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
  const reponses = input.reponses && typeof input.reponses === "object" ? input.reponses : {};
  const corrections = input.correctionsIA || {};

  let qcmPoints = 0;
  let qcmMax = 0;
  let qrcManualPoints = 0;
  let qrcMax = 0;
  let answeredCount = 0;
  const qrcPending: string[] = [];
  const qrcEmpty: string[] = [];

  for (const q of questions) {
    const pts = getPointsParQuestion(input.matiere.id, q.type, input.matiere);
    const rep = reponses[q.id as any] ?? reponses[String(q.id)];
    const answered = hasAnswer(rep);
    if (answered) answeredCount++;

    if (q.type === "QCM") {
      qcmMax += pts;
      const correctes = getCorrectQcmChoices(q).slice().sort();
      const donnees = normalizeSelectedChoices(rep).slice().sort();
      if (correctes.length > 0 && JSON.stringify(correctes) === JSON.stringify(donnees)) qcmPoints += pts;
      continue;
    }

    if (q.type === "QRC") {
      qrcMax += pts;
      const correction = corrections[q.id as any] ?? corrections[String(q.id)] ?? corrections[`Q${String(q.id)}`];
      if (isQrcCorrectionValidated(correction)) {
        // Correction manuelle définitive : points repris exactement, jamais recalculés.
        qrcManualPoints += clamp(Number(correction?.pointsObtenus) || 0, 0, pts);
      } else if (answered) {
        qrcPending.push(String(q.id));
      } else {
        qrcEmpty.push(String(q.id));
      }
    }
  }

  const scoreMax = qcmMax + qrcMax;
  const scoreObtenu = clamp(qcmPoints + qrcManualPoints, 0, Math.max(scoreMax, 0));

  return {
    // Aucune réponse enregistrée ⇒ pas de reconstruction, pas de note à 0.
    recoverable: answeredCount > 0 && questions.length > 0,
    answeredCount,
    totalQuestions: questions.length,
    qcmPoints,
    qcmMax,
    qrcManualPoints,
    qrcMax,
    qrcPending,
    qrcEmpty,
    scoreObtenu,
    scoreMax,
    noteSur20: normalizeNoteSur20(scoreObtenu, scoreMax),
    admis: computeAdmisForMatiere(scoreObtenu, scoreMax, input.matiere?.noteEliminatoire, input.matiere?.noteSur || 20, false),
    qrcPendingCorrection: qrcPending.length > 0,
    reponses: { ...reponses },
  };
}

/**
 * Garde-fou de finalisation : autorise l'écriture d'un résultat UNIQUEMENT si
 * des réponses réelles existent. Empêche toute note technique à 0 créée par un
 * échec de « Terminer la matière ».
 */
export function canFinalizeMatiere(recovery: MatiereRecovery): boolean {
  return recovery.recoverable;
}
