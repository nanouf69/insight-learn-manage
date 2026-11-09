/** Project a fresh read onto the SAME immutable subject result IDs only. */
export function rafraichirCopiesAffichees<T extends Record<string, any>>(displayed: T[], fresh: any[], score: (row: any, previous: T) => any): T[] {
  const byId = new Map(fresh.map(r => [String(r.id), r]));
  return displayed.map(previous => {
    const row = byId.get(String(previous.resultId ?? ''));
    if (!row || row.quiz_id !== previous.quizId || row.matiere_id !== previous.matiereId) return previous;
    const value = score(row, previous);
    return { ...previous, details: row.details, reponses: row.details?.reponses ?? {},
      correctionsIA: row.details?.correctionsIA ?? null, tentative: row.tentative,
      noteObtenue: value?.scoreObtenu ?? previous.noteObtenue, maxPoints: value?.scoreMax ?? previous.maxPoints,
      admis: value?.admis ?? previous.admis };
  });
}