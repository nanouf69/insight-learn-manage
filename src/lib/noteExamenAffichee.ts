import { matchCoreState, coreStateScore, type CoreMatiereState } from "@/lib/coreExamPublication";
import { isQrcPendingCorrection } from "@/components/cours-en-ligne/exam-helpers";
import { MENTION_NOTE_RECALCULEE } from "@/lib/passagesV2NonFiables";

/**
 * FONCTION COMMUNE — note et statut affichés d'un résultat d'examen blanc.
 * Utilisée par « Mes notes » (élève) et la fiche Résultats (admin) :
 * les deux écrans ne peuvent plus diverger.
 *
 * Règles :
 * 1. Lecture du nouveau moteur impossible → « Note en attente » (jamais une note douteuse).
 * 2. Passage nouveau moteur fiable → note et statut viennent uniquement de ce passage.
 * 3. Passage nouveau moteur non fiable (défaut du 23/09) → note de l'ancien système,
 *    avec la mention « note recalculée depuis les réponses complètes ».
 * 4. Pas de passage nouveau moteur → ancien affichage inchangé.
 * Lecture seule : aucune écriture.
 */

/** Marqueur de lecture impossible (fail-closed) : compris par isExamAttemptPublicationPending. */
export const CORE_LECTURE_IMPOSSIBLE = Object.freeze({ pending: true, lectureImpossible: true, note20: null });

export function estExamenBlanc(row: any): boolean {
  return row?.quiz_type === "examen_blanc" || row?.quiz_type === "examen_blanc_taxi";
}

/**
 * Rattache à une ligne de résultat la source unique à utiliser.
 * - `coreStates` null = lecture du nouveau moteur impossible.
 * - `nonFiables` null = repérage des passages non fiables impossible.
 */
export function attacherSourceUnique<T extends Record<string, any>>(
  row: T,
  coreStates: CoreMatiereState[] | null,
  nonFiables: Set<string> | null,
): T & { __core: any; __noteRecalculee?: boolean } {
  if (!estExamenBlanc(row)) return { ...row, __core: null };
  if (coreStates === null) return { ...row, __core: CORE_LECTURE_IMPOSSIBLE };
  const core = matchCoreState(coreStates, row.quiz_id, row.matiere_id, row.completed_at, row.id);
  if (!core) return { ...row, __core: null };
  if (nonFiables === null) return { ...row, __core: CORE_LECTURE_IMPOSSIBLE };
  if (nonFiables.has(core.attemptId)) return { ...row, __core: null, __noteRecalculee: true };
  return { ...row, __core: core };
}

export type NoteAffichee =
  | { etat: "note"; note20: number; source: "noyau" | "ancien"; mention: string | null }
  | { etat: "en_attente"; note20: null; source: "noyau" | "ancien"; mention: string | null }
  | { etat: "lecture_impossible"; note20: null; source: null; mention: null };

function noteAncienSur20(row: any): number | null {
  const score = Number(row?.score_obtenu ?? 0);
  const max = Number(row?.score_max ?? 0);
  if (Number.isFinite(max) && max > 0) {
    const s = Math.min(Math.max(Number.isFinite(score) ? score : 0, 0), max);
    return Number(((s / max) * 20).toFixed(1));
  }
  if (row?.note_sur_20 == null) return null;
  const f = Number(row.note_sur_20);
  return Number.isFinite(f) ? Number(Math.min(Math.max(f, 0), 20).toFixed(1)) : null;
}

/** Note et statut d'une ligne déjà passée par attacherSourceUnique. */
export function noteExamenAffichee(row: any): NoteAffichee {
  const core = row?.__core;
  const mention = row?.__noteRecalculee ? MENTION_NOTE_RECALCULEE : null;
  if (core?.lectureImpossible) return { etat: "lecture_impossible", note20: null, source: null, mention: null };
  if (core) {
    const sc = coreStateScore(core);
    if (!sc) return { etat: "en_attente", note20: null, source: "noyau", mention: null };
    return { etat: "note", note20: Number(sc.noteSur20.toFixed(1)), source: "noyau", mention: null };
  }
  if (estExamenBlanc(row) && isQrcPendingCorrection(row?.details)) {
    return { etat: "en_attente", note20: null, source: "ancien", mention };
  }
  const n = noteAncienSur20(row);
  if (n == null) return { etat: "en_attente", note20: null, source: "ancien", mention };
  return { etat: "note", note20: n, source: "ancien", mention };
}
