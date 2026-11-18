/** Rendered/canonical question arrays are projections, never deletion commands. */
export function explicitQuestionEditIds(exerciseId: number, questionIds: readonly number[]): Set<string> {
  return new Set(questionIds.filter(Number.isSafeInteger).map(id => `${exerciseId}-${id}`));
}

export function applyQuestionSaveIntent<T extends { exercices?: any[] }>(
  data: T,
  server: { exercices?: any[] } | null,
  edited: ReadonlySet<string>,
  added: ReadonlySet<string>,
  deleted: ReadonlySet<string>,
): T {
  if (!Array.isArray(server?.exercices) || !Array.isArray(data.exercices)) {
    throw new Error('Lecture complète du module indisponible : aucune sauvegarde envoyée.');
  }
  const localById = new Map(data.exercices.map(e => [String(e.id), e]));
  const serverIds = new Set(server.exercices.map(e => String(e.id)));
  const exercices = server.exercices.map(srv => {
    const local = localById.get(String(srv.id));
    if (!local) return srv;
    const localQuestions = new Map((local.questions ?? []).map((q: any) => [String(q.id), q]));
    const questionIds = new Set((srv.questions ?? []).map((q: any) => String(q.id)));
    const questions = (srv.questions ?? []).flatMap((q: any) => {
      const key = `${Number(srv.id)}-${Number(q.id)}`;
      if (deleted.has(key)) return [];
      const replacement = localQuestions.get(String(q.id));
      return [edited.has(key) && replacement ? replacement : q];
    });
    for (const q of local.questions ?? []) {
      const key = `${Number(srv.id)}-${Number(q.id)}`;
      if (!questionIds.has(String(q.id)) && added.has(key) && !deleted.has(key)) questions.push(q);
    }
    return { ...local, questions };
  });
  for (const exercise of data.exercices) if (!serverIds.has(String(exercise.id))) exercices.push(exercise);
  return { ...data, exercices };
}

/** Historical JSON-only rows remain stored, but must not become canonical upserts. */
export function isCanonicalQuestionSaveIntent(
  exerciseId: number,
  questionId: number,
  edited: ReadonlySet<string>,
  added: ReadonlySet<string>,
) {
  const key = `${exerciseId}-${questionId}`;
  return edited.has(key) || added.has(key);
}
const comparableQuestion = (q: any) => JSON.stringify({
  enonce: String(q?.enonce ?? ""),
  choix: (Array.isArray(q?.choix) ? q.choix : []).map((c: any) => ({
    lettre: String(c?.lettre ?? ""),
    texte: String(c?.texte ?? ""),
    correct: c?.correct === true,
  })),
  explication: q?.explication ?? null,
  reponseQRC: q?.reponseQRC ?? null,
});

/**
 * Relecture obligatoire : renvoie les clés `exo-question` dont la version
 * relue en base diffère de la modification envoyée (ou est absente).
 * Une liste non vide = la sauvegarde n'a PAS été conservée.
 */
export function questionsNonConservees(
  sent: { exercices?: any[] } | null | undefined,
  readBack: { exercices?: any[] } | null | undefined,
  edited: ReadonlySet<string>,
): string[] {
  const index = (data: { exercices?: any[] } | null | undefined) => {
    const map = new Map<string, any>();
    for (const e of data?.exercices ?? []) for (const q of e?.questions ?? []) map.set(`${Number(e.id)}-${Number(q?.id)}`, q);
    return map;
  };
  const sentMap = index(sent);
  const readMap = index(readBack);
  const mismatches: string[] = [];
  for (const key of edited) {
    const intended = sentMap.get(key);
    if (!intended) continue; // pas dans ce module (ou supprimée volontairement)
    const stored = readMap.get(key);
    if (!stored || comparableQuestion(stored) !== comparableQuestion(intended)) mismatches.push(key);
  }
  return mismatches;
}
