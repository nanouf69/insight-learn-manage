/** A save acknowledges its captured draft, never a later edit in the same editor. */
export function acknowledgedEditorState<T>(previous: T, confirmed: T, savedRevision: number, currentRevision: number): T {
  return savedRevision === currentRevision ? confirmed : previous;
}

/** A currency sign with no amount is an unfinished input, not a publishable choice. */
export function isIncompleteCurrencyChoice(value: unknown): boolean {
  return typeof value === 'string' && /^[\s_]*(?:€|euros?)[\s_]*$/i.test(value);
}