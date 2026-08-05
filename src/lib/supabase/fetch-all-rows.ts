/**
 * Pagination helper — Supabase/PostgREST renvoie au maximum 1000 lignes par requête.
 * Pour les apprenants avec un gros historique (connexions, activités, exercices),
 * cela tronquait silencieusement les données et produisait des relevés PDF
 * différents d'un candidat à l'autre.
 *
 * fetchAllRows() parcourt toutes les pages jusqu'à récupérer l'intégralité des lignes.
 */
const PAGE_SIZE = 1000;

export async function fetchAllRows<T = any>(
  buildQuery: (from: number, to: number) => any,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  // Garde-fou : 50 pages max (50 000 lignes) pour éviter toute boucle infinie.
  for (let page = 0; page < 50; page++) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data as T[]) || [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}
