/**
 * État « refaire les fausses » d'un quiz déjà remis : règles pures, sans écriture.
 * - Une révision n'est sauvegardée que si elle est réellement ouverte à l'écran
 *   (ou explicitement forcée) : jamais de copie miroir des réponses initiales.
 * - Une révision dont les résultats sont affichés n'est jamais rouverte au rechargement.
 * - Une révision est « terminée » quand chaque question initialement fausse a reçu
 *   une nouvelle réponse non vide, différente de la réponse initiale.
 */
type Rep = string | string[] | undefined | null;

export function exoSauvegardable(p: { soumis: boolean; fige: boolean; revisionOuverte: boolean; force: boolean }): boolean {
  if (!p.soumis && !p.fige) return true;
  return p.revisionOuverte || p.force;
}

export function revisionsSessionARestaurer<T>(
  revisions: Record<string, T>,
  resultatsAffiches: Iterable<number>,
): Record<number, T> {
  const affiches = new Set(Array.from(resultatsAffiches, Number));
  const out: Record<number, T> = {};
  for (const [k, v] of Object.entries(revisions)) {
    const id = Number(k);
    if (Number.isFinite(id) && !affiches.has(id)) out[id] = v;
  }
  return out;
}

const vide = (v: Rep) => v == null || v === "" || (Array.isArray(v) && v.length === 0);
const norm = (v: Rep) => (Array.isArray(v) ? [...v].sort().join("|") : String(v ?? ""));

export function revisionFaussesTerminee(
  initiales: Record<string, Rep>,
  revision: Record<string, Rep> | null | undefined,
  clesFausses: string[],
): boolean {
  if (!revision || clesFausses.length === 0) return false;
  return clesFausses.every((k) => !vide(revision[k]) && norm(revision[k]) !== norm(initiales[k]));
}
