type Page<T> = { data: T[] | null; error: unknown };

/** A failed page must never masquerade as missing documentary evidence. */
export async function lirePagesQualiopi<T>(
  lire: (from: number, to: number) => PromiseLike<Page<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  const taille = 500;
  for (let from = 0; ; from += taille) {
    const { data, error } = await lire(from, from + taille - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < taille) return rows;
  }
}