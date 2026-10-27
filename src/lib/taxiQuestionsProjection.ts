/**
 * PRÉPARATION (non branchée à l'écran) — projection d'affichage des questions TAXI/TA mal placées.
 * Aucune donnée n'est déplacée : chaque question garde son identité d'origine (exercice + numéro),
 * donc les réponses, notes, copies et jalons historiques restent rattachés.
 * Appliquée seulement aux candidats qui n'ont encore AUCUNE réponse sur les exercices source et cible ;
 * les autres voient exactement l'ancien affichage (aucune nouvelle exigence, aucun compteur modifié).
 */
export const MODULES_TAXI_TA = [10, 24, 40, 42] as const;

/** Doublons exacts N2 → N1 : 71-x est identique à 70-y (déjà présente en N1, donc jamais ré-affichée). */
export const DOUBLONS_N2_VERS_N1: Record<number, number> = {
  44: 2, 45: 12, 46: 10, 47: 11, 48: 19, 49: 27, 50: 18, 51: 8, 52: 1, 54: 46, 55: 9, 57: 39,
};
/** Série 2 (ex76) dont le contenu relève de Locale 2/3 (ex74), après vérification individuelle. */
export const SERIE2_VERS_LOCALE2 = [18, 19, 20, 21, 22, 23, 24, 25, 26, 27];

export type QRef = { exerciceId: number; questionId: number };
export type ProjectionInput = { moduleId: number; exerciceId: number; questions: QRef[]; aDejaRepondu: (exerciceId: number) => boolean };

export function projeterQuestionsTaxi({ moduleId, exerciceId, questions, aDejaRepondu }: ProjectionInput, toutes: QRef[]): QRef[] {
  if (!(MODULES_TAXI_TA as readonly number[]).includes(Number(moduleId))) return questions;
  const neuf = (...ex: number[]) => ex.every((e) => !aDejaRepondu(e));
  if (exerciceId === 71 && neuf(70, 71)) return questions.filter((q) => !(q.exerciceId === 71 && q.questionId in DOUBLONS_N2_VERS_N1));
  if (exerciceId === 76 && neuf(74, 76)) return questions.filter((q) => !(q.exerciceId === 76 && SERIE2_VERS_LOCALE2.includes(q.questionId)));
  if (exerciceId === 74 && neuf(74, 76)) {
    const ajout = toutes.filter((q) => q.exerciceId === 76 && SERIE2_VERS_LOCALE2.includes(q.questionId));
    return [...questions, ...ajout.filter((a) => !questions.some((q) => q.exerciceId === a.exerciceId && q.questionId === a.questionId))];
  }
  return questions;
}
