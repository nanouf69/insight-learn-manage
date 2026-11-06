import type { Matiere } from "./examens-blancs-data";

/** Plus petit ID libre sans jamais réutiliser celui d'une question supprimée après ce compteur. */
export function prochainIdQuestionDisponible(matiere: Pick<Matiere, "questions" | "prochainIdQuestion">): number {
  return Math.max(
    Number(matiere.prochainIdQuestion) || 1,
    1,
    ...(matiere.questions ?? []).map((q) => Number.isSafeInteger(q?.id) && q.id > 0 ? q.id + 1 : 1),
  );
}
