type Question = { id: number | string };
type Exercise = { id: number; actif: boolean; questions?: Question[]; deletedQuestionIds?: (number | string)[]; sousTitre?: string };

/** Current module 13 only. Never pass archived passages through this projection. */
export function controleConnaissancesDisplay<T extends { id: number; exercices: Exercise[] }>(data: T): T {
  if (Number(data.id) !== 13) return data;
  let changed = false;
  const exercices = data.exercices.map(exercise => {
    const deleted = new Set((exercise.deletedQuestionIds ?? []).map(String));
    const questions = (exercise.questions ?? []).filter(question => !deleted.has(String(question.id)));
    const sousTitre = exercise.sousTitre?.replace(/\b\d+\s+questions\b/i, `${questions.length} questions`);
    if (questions.length === (exercise.questions ?? []).length && sousTitre === exercise.sousTitre) return exercise;
    changed = true;
    return { ...exercise, questions, sousTitre };
  });
  return changed ? { ...data, exercices } : data;
}