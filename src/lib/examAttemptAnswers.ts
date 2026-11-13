/** Exact native-attempt read model. A legacy exercise key is never an attempt proof. */
export function examAttemptAnswers(subject: string, questionIds: string[], rows: {question_id: string; valeur: unknown; revision?: number}[]): Record<string, unknown> {
  const required = new Set(questionIds);
  const prefix = `${subject}:`;
  if (!required.size || required.size !== questionIds.length || questionIds.some(id => !id.startsWith(prefix))) throw new Error('Identité des questions non prouvée.');
  const seen = new Set<string>();
  const answers: Record<string, unknown> = {};
  for (const row of rows) {
    if (!required.has(row.question_id) || seen.has(row.question_id)) throw new Error('Réponses de copie ambiguës ; revue nécessaire.');
    seen.add(row.question_id);
    answers[row.question_id.slice(prefix.length)] = row.valeur;
  }
  return answers;
}