import { canonique } from "@/lib/originauxExacts";

type Objet = Record<string, any>;
const objet = (value: unknown): Objet => value && typeof value === "object" && !Array.isArray(value) ? value as Objet : {};

export const revisionReponseRenseignee = (answer: unknown): boolean =>
  typeof answer === "string" ? answer.trim().length > 0 : Array.isArray(answer) && answer.length > 0;

/** Route back to missing evidence, even when an old draft claims it was checked. */
export function premiereQuestionRevisionIncomplete(answers: Record<string, unknown>, checked: string[], order: string[]): number {
  return order.findIndex(key => !checked.includes(key) || !revisionReponseRenseignee(answers[key]));
}

/** Completion is coverage, not a perfect mark or the last visible index. */
export function revisionCouvertureConfirmee(reponses: unknown, examen: string, order: string[]): boolean {
  const state = objet(objet(reponses).revisionState);
  const answers = objet(state.answers);
  return state.examenId === examen && order.length > 0 && new Set(order).size === order.length
    && canonique(state.questionOrder) === canonique(order)
    && Array.isArray(state.correctedQuestions)
    && order.every(key => state.correctedQuestions.includes(key) && Object.prototype.hasOwnProperty.call(answers, key)
      && revisionReponseRenseignee(answers[key]));
}

/** A result read back for this exact revision, never a neighbouring exam/attempt. */
export function revisionResultatConfirme(result: unknown, owner: string, examen: string, exercice: string,
  reponses: unknown, order: string[], score: number): boolean {
  const row = objet(result), details = objet(row.details), state = objet(objet(reponses).revisionState);
  return typeof row.id === "string" && row.apprenant_id === owner && row.quiz_id === examen
    && row.quiz_type === "revision_fausses" && details.revision_exercice_id === exercice
    && Number(row.score_obtenu) === score && Number(row.score_max) === order.length
    && canonique(details.questionOrder) === canonique(order) && canonique(details.reponses) === canonique(state.answers)
    && revisionCouvertureConfirmee(reponses, examen, order);
}