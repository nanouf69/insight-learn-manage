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

export function revisionRepriseProuvee(
  initiales: Record<string, Rep>,
  revision: Record<string, Rep> | null | undefined,
  clesFausses: string[],
): boolean {
  if (!revision || clesFausses.length === 0) return false;
  // Une copie miroir ne prouve aucune reprise. En revanche, une réponse effacée,
  // remplacée ou nouvellement saisie sur une question initialement fausse suffit,
  // même si cette nouvelle réponse est encore fausse.
  return clesFausses.some((k) => norm(revision[k]) !== norm(initiales[k]));
}

export function revisionFaussesTerminee(
  initiales: Record<string, Rep>,
  revision: Record<string, Rep> | null | undefined,
  clesFausses: string[],
): boolean {
  if (!revision || clesFausses.length === 0) return false;
  // Terminée = reprise prouvée (pas une copie miroir) ET chaque question
  // initialement fausse a de nouveau une réponse. Retenir la même réponse
  // qu'au départ reste une correction faite : ne jamais la redemander en boucle.
  return revisionRepriseProuvee(initiales, revision, clesFausses) && clesFausses.every((k) => !vide(revision[k]));
}

/** Questions encore à refaire dans une reprise prouvée : uniquement les réponses vides. */
export function questionsRevisionRestantes(revision: Record<string, Rep> | null | undefined, clesFausses: string[]): string[] {
  return clesFausses.filter((k) => vide(revision?.[k]));
}

/**
 * Valider un quiz déjà remis n'écrit une révision que si elle est réellement
 * ouverte : sinon les réponses affichées sont la copie initiale, et les
 * renvoyer écraserait une vraie correction par un miroir.
 */
export function validationEcritRevision(p: { dejaRemis: boolean; revisionOuverte: boolean }): boolean {
  return !p.dejaRemis || p.revisionOuverte;
}

/**
 * Les contrôles/résultats du quiz initial ne s'affichent jamais par-dessus une
 * reprise réellement ouverte, même si un état « résultats » résiduel subsiste.
 */
export function resultatsInitiauxAffiches(p: { showResults: boolean; revisionOuverte: boolean }): boolean {
  return p.showResults && !p.revisionOuverte;
}

/** Un clic de réponse est accepté hors aperçu/verrou, sauf résultats initiaux réellement affichés. */
export function reponseQuizAcceptee(p: { apercuAdmin: boolean; verrouillee: boolean; showResults: boolean; revisionOuverte: boolean }): boolean {
  if (p.apercuAdmin || p.verrouillee) return false;
  return !resultatsInitiauxAffiches(p);
}
