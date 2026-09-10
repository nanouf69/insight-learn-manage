export type HistoricalAnswer = string | string[];

type CurrentExercise = {
  id: number | string;
  questions?: Array<{ id: number | string; enonce?: string }>;
};

type HistoricalQuestionDetail = {
  exerciceId?: number | string;
  questionId?: number | string;
  enonce?: string;
  reponseEleve?: unknown;
};

const normalizeQuestionText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isHistoricalAnswer = (value: unknown): value is HistoricalAnswer =>
  typeof value === "string" || Array.isArray(value);

/**
 * Reconnecte en mémoire une réponse historique à la question actuellement
 * affichée. La base n'est jamais modifiée. Le rapprochement par texte n'est
 * utilisé que s'il est unique dans le même exercice.
 */
export function reconcileHistoricalAnswers(
  savedAnswers: Record<string, HistoricalAnswer>,
  details: HistoricalQuestionDetail[] | null | undefined,
  exercises: CurrentExercise[],
): Record<string, HistoricalAnswer> {
  const reconciled = { ...savedAnswers };
  if (!Array.isArray(details) || details.length === 0) return reconciled;

  const detailsByExerciseAndText = new Map<string, HistoricalQuestionDetail[]>();
  for (const detail of details) {
    const exerciseId = String(detail?.exerciceId ?? "");
    const fingerprint = normalizeQuestionText(detail?.enonce);
    if (!exerciseId || !fingerprint) continue;
    const indexKey = `${exerciseId}::${fingerprint}`;
    const matches = detailsByExerciseAndText.get(indexKey) ?? [];
    matches.push(detail);
    detailsByExerciseAndText.set(indexKey, matches);
  }

  for (const exercise of exercises) {
    const exerciseId = String(exercise.id);
    for (const question of exercise.questions ?? []) {
      const currentKey = `${exerciseId}-${question.id}`;
      if (reconciled[currentKey] !== undefined) continue;

      const fingerprint = normalizeQuestionText(question.enonce);
      if (!fingerprint) continue;
      const matches = detailsByExerciseAndText.get(`${exerciseId}::${fingerprint}`) ?? [];
      if (matches.length !== 1) continue;

      const snapshot = matches[0];
      const historicalKey = `${exerciseId}-${snapshot.questionId}`;
      const answer = reconciled[historicalKey] ?? snapshot.reponseEleve;
      if (isHistoricalAnswer(answer)) reconciled[currentKey] = answer;
    }
  }

  return reconciled;
}