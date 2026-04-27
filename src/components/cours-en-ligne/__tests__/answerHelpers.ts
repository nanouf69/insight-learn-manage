// Helpers extraits de ModuleDetailView.tsx (LearnerPreview) pour tests unitaires.
// Ils doivent rester strictement identiques à ceux du composant.
// Si vous modifiez l'un, modifiez l'autre.

export type ChoixLike = { lettre: string; correct?: boolean };
export type QuestionLike = { choix?: ChoixLike[] } | null | undefined;

export const getQuestionChoices = (q: QuestionLike): ChoixLike[] =>
  Array.isArray(q?.choix) ? (q!.choix as ChoixLike[]) : [];

export const isAnswerCorrect = (
  selected: string | string[] | undefined,
  q: QuestionLike
): boolean => {
  const selectedLetters = Array.isArray(selected)
    ? selected.filter(Boolean)
    : selected
    ? [selected]
    : [];
  if (selectedLetters.length === 0) return false;

  const correctLetters = getQuestionChoices(q)
    .filter((c) => c.correct)
    .map((c) => c.lettre)
    .sort();
  if (correctLetters.length === 0) return false;

  return (
    JSON.stringify([...selectedLetters].sort()) ===
    JSON.stringify(correctLetters)
  );
};
