/**
 * Lecture COMPLÈTE (lecture seule) pour la surveillance des examens.
 * La base ne renvoie jamais plus de 1 000 lignes par demande : on lit donc
 * par paquets (pagination) et on découpe les listes d'identifiants.
 */
export const TAILLE_PAGE = 1000;
export const TAILLE_LOT_IDS = 100;

/** Appelle `lirePage(debut, fin)` jusqu'à épuisement (page incomplète). */
export async function lireToutesLesPages<T>(
  lirePage: (debut: number, fin: number) => Promise<{ data: T[] | null; error: unknown }>,
  taillePage = TAILLE_PAGE,
): Promise<T[]> {
  const tout: T[] = [];
  for (let debut = 0; ; debut += taillePage) {
    const { data, error } = await lirePage(debut, debut + taillePage - 1);
    if (error) throw error;
    const page = data ?? [];
    tout.push(...page);
    if (page.length < taillePage) break;
  }
  return tout;
}

/** Découpe les ids en lots, puis pagine chaque lot. */
export async function lireParLotsEtPages<T>(
  ids: string[],
  lirePage: (lot: string[], debut: number, fin: number) => Promise<{ data: T[] | null; error: unknown }>,
  tailleLot = TAILLE_LOT_IDS,
  taillePage = TAILLE_PAGE,
): Promise<T[]> {
  const tout: T[] = [];
  for (let i = 0; i < ids.length; i += tailleLot) {
    const lot = ids.slice(i, i + tailleLot);
    tout.push(...(await lireToutesLesPages((d, f) => lirePage(lot, d, f), taillePage)));
  }
  return tout;
}
