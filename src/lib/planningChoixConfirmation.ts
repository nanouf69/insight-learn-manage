function normaliser(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normaliser);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, normaliser(v)]));
  }
  return value;
}

/** A successful request without an identical returned row is not a saved choice. */
export function confirmerChoixPlanning(data: Record<string, unknown> | null, expected: Record<string, unknown>) {
  if (!data) throw new Error('Planning non retrouvé : enregistrement non confirmé.');
  for (const [key, value] of Object.entries(expected)) {
    if (key === 'updated_at') continue;
    if (JSON.stringify(normaliser(data[key])) !== JSON.stringify(normaliser(value))) {
      throw new Error('Choix non confirmés après enregistrement : réessayez.');
    }
  }
}