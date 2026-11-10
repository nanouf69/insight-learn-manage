export interface RevisionQuestionIdentity {
  matiere: { id?: string | number | null };
  question: { id?: string | number | null };
  sourceResultId?: string | null;
}

export interface RevisionProgressState {
  version: 1;
  examenId: string;
  answers: Record<string, unknown>;
  currentIndex: number;
  correctedCount: number;
  correctedQuestions: string[];
  showCorrection: boolean;
  questionOrder: string[];
  sourceResultIds?: Record<string, string>;
}

export const revisionQuestionKey = (item: RevisionQuestionIdentity): string =>
  `${String(item.matiere?.id ?? "matiere")}:${String(item.question?.id ?? "question")}`;

/**
 * Réponse de révision affichée pour une question : la clé matière:question
 * fait foi. Une ancienne clé nue (« 2 ») n'est reprise que si une seule
 * question de la liste porte cet identifiant ; sinon elle pourrait venir
 * d'une autre matière et n'est jamais proposée.
 */
export function reponseRevisionAffichee(
  reponses: Record<string, unknown>,
  items: RevisionQuestionIdentity[],
  current: RevisionQuestionIdentity,
): unknown {
  const key = revisionQuestionKey(current);
  if (Object.prototype.hasOwnProperty.call(reponses, key)) return reponses[key];
  const bare = String(current.question?.id ?? "");
  if (!bare || !Object.prototype.hasOwnProperty.call(reponses, bare)) return undefined;
  const homonymes = items.filter((it) => String(it.question?.id ?? "") === bare).length;
  return homonymes === 1 ? reponses[bare] : undefined;
}

export const revisionQuestionOrder = (items: RevisionQuestionIdentity[]): string[] =>
  items.map(revisionQuestionKey);

export function creerRevisionProgressState(input: {
  examenId: string;
  answers: Record<string, unknown>;
  currentIndex: number;
  correctedCount: number;
  correctedQuestions: string[];
  showCorrection: boolean;
  questionOrder: string[];
  sourceResultIds?: Record<string, string>;
}): RevisionProgressState {
  return {
    version: 1,
    examenId: input.examenId,
    answers: { ...input.answers },
    currentIndex: input.currentIndex,
    correctedCount: input.correctedCount,
    correctedQuestions: [...new Set(input.correctedQuestions.map(String))],
    showCorrection: input.showCorrection,
    questionOrder: [...input.questionOrder],
    ...(input.sourceResultIds ? { sourceResultIds: { ...input.sourceResultIds } } : {}),
  };
}

export function restaurerRevisionProgressState(
  saved: unknown,
  examenId: string,
  questionOrder: string[],
): RevisionProgressState & { contexteChange: boolean } {
  const root = saved && typeof saved === "object" ? saved as Record<string, any> : {};
  const enveloppe = root.revisionState && typeof root.revisionState === "object" ? root.revisionState : null;
  const state = (enveloppe ?? root) as Record<string, any>;
  const answers = state.answers && typeof state.answers === "object" && !Array.isArray(state.answers)
    ? { ...state.answers }
    : {};
  const correctedQuestions = Array.isArray(state.correctedQuestions)
    ? [...new Set(state.correctedQuestions.map(String))]
    : [];
  const storedOrder = Array.isArray(state.questionOrder) ? state.questionOrder.map(String) : [];
  const sameExam = !state.examenId || state.examenId === examenId;
  const sameOrder = storedOrder.length > 0 && JSON.stringify(storedOrder) === JSON.stringify(questionOrder);
  const exact = Boolean(enveloppe) && sameExam && sameOrder;
  let currentIndex = 0;
  let showCorrection = false;
  if (exact && questionOrder.length > 0) {
    currentIndex = Math.max(0, Math.min(questionOrder.length - 1, Number.isInteger(state.currentIndex) ? state.currentIndex : 0));
    showCorrection = state.showCorrection === true && correctedQuestions.includes(questionOrder[currentIndex]);
  } else if (questionOrder.length > 0) {
    // Ancien format ou liste devenue différente : ne jamais faire refaire une
    // question déjà validée identifiable, sans prétendre retrouver une position exacte.
    const firstOpen = questionOrder.findIndex((key) => !correctedQuestions.includes(key));
    currentIndex = firstOpen >= 0 ? firstOpen : questionOrder.length - 1;
  }
  return {
    version: 1,
    examenId,
    answers,
    currentIndex,
    correctedCount: Number.isFinite(state.correctedCount) ? Math.max(0, Number(state.correctedCount)) : 0,
    correctedQuestions,
    showCorrection,
    questionOrder: [...questionOrder],
    ...(state.sourceResultIds && typeof state.sourceResultIds === "object" && !Array.isArray(state.sourceResultIds)
      ? { sourceResultIds: { ...state.sourceResultIds } } : {}),
    contexteChange: Boolean(enveloppe) && (!sameExam || !sameOrder),
  };
}
