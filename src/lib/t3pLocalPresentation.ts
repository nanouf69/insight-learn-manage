/** Course-only view. Never use its groups as persistence or submission exercises. */
export interface T3pQuestion { id: number | string }
export interface T3pExercise<Q extends T3pQuestion> {
  id: number;
  actif: boolean;
  questions?: readonly Q[];
}
export interface T3pDisplayQuestion<Q extends T3pQuestion> {
  question: Q;
  moduleId: number;
  originalExerciseId: number;
  originalIndex: number;
  answerKey: string;
  identity: string;
  label: string;
}
export interface T3pLocalPresentation<Q extends T3pQuestion, E extends T3pExercise<Q>> {
  /** Same array and objects, not reconstructed from the display. */
  originalExercises: readonly E[];
  parts: Record<1 | 2, T3pDisplayQuestion<Q>[]>;
}

export function projectT3pLocalPresentation<Q extends T3pQuestion, E extends T3pExercise<Q>>(
  moduleId: number,
  context: "cours-et-exercices" | "other",
  exercises: readonly E[],
): T3pLocalPresentation<Q, E> | null {
  if (context !== "cours-et-exercices" || (moduleId !== 2 && moduleId !== 10)) return null;
  const first = exercises.filter(e => e.id === 1 && e.actif);
  const second = exercises.filter(e => e.id === 2 && e.actif);
  if (first.length !== 1 || second.length !== 1) return null;
  const originals = [first[0], second[0]];
  const seen = new Set<string>();
  const parts: Record<1 | 2, T3pDisplayQuestion<Q>[]> = { 1: [], 2: [] };
  for (const exercise of originals) {
    if (!exercise.questions?.length) return null;
    for (const [originalIndex, question] of exercise.questions.entries()) {
      const answerKey = `${exercise.id}-${question.id}`;
      if (seen.has(answerKey)) return null; // Preserve conflicts: do not deduplicate.
      seen.add(answerKey);
      let part: 1 | 2 = exercise.id === 1 ? 1 : 2;
      if (exercise.id === 2 && ["73", "74", "76"].includes(String(question.id))) part = 1;
      if (exercise.id === 1 && String(question.id) === "59") part = 2;
      parts[part].push({
        question, moduleId, originalExerciseId: exercise.id, originalIndex,
        answerKey, identity: `module_${moduleId}_exo_${exercise.id}/question_${question.id}`,
        label: `T3P P${exercise.id} · Q${question.id}`,
      });
    }
  }
  // A partial/live source must never quietly remove one of the four transfers.
  if (!["1-59", "2-73", "2-74", "2-76"].every(key => seen.has(key))) return null;
  return { originalExercises: exercises, parts };
}