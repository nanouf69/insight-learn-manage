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

export function canonicalRowsControle<T extends { section_id: number; legacy_question_id: number }>(data: { id: number; exercices: Exercise[] }, rows: T[]): T[] {
  if (Number(data.id) !== 13) return rows;
  return rows.filter(row => {
    const exercise = data.exercices.find(ex => Number(ex.id) === Number(row.section_id));
    return exercise?.questions?.some(q => String(q.id) === String(row.legacy_question_id)) === true && !(exercise.deletedQuestionIds ?? []).some(id => String(id) === String(row.legacy_question_id));
  });
}