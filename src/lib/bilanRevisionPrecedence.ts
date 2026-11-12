/** Frozen original proof remains a fallback, never an overlay on an editable revision. */
export function reponsesArchiveHorsRevision<T>(archives: Record<number, { reponses?: Record<string, T> }>, revisions: ReadonlySet<number>): Record<string, T> {
  return Object.fromEntries(Object.entries(archives).filter(([exo]) => !revisions.has(Number(exo))).flatMap(([, p]) => Object.entries(p.reponses ?? {})));
}