/**
 * « Passer cette correction et continuer » : sortie facultative d'une reprise
 * des questions fausses. Lecture seule. Seule une preuve serveur de l'envoi
 * initial (ligne status=submitted, ou passage figé lu sur le serveur) peut
 * restaurer des réponses ; une révision seule ou un essai local n'en sont pas.
 */
export type Reponses = Record<string, string | string[]>;

/** Résultat de la relecture serveur de la tentative initiale. */
export type LectureInitiale =
  | { ok: true; row: { status?: string | null; reponses?: unknown } | null }
  | { ok: false };

const filtrer = (exoId: number, src: unknown): Reponses | null => {
  if (!src || typeof src !== "object") return null;
  const out: Reponses = {};
  for (const [k, v] of Object.entries(src as Record<string, any>)) if (k.startsWith(`${exoId}-`) && v != null) out[k] = v;
  return Object.keys(out).length > 0 ? out : null;
};

/**
 * @param cacheConfirme réponses d'une ligne submitted déjà relue sur le serveur
 *   pendant cette session (utilisées seulement si la relecture échoue).
 * @param passageFigeServeur réponses d'un passage figé lu sur le serveur.
 */
export function reponsesInitialesPourSortie(
  exoId: number,
  lecture: LectureInitiale,
  cacheConfirme: Reponses | null,
  passageFigeServeur: Reponses | null = null,
): Reponses | null {
  if (lecture.ok) {
    if (lecture.row) return lecture.row.status === "submitted" ? filtrer(exoId, lecture.row.reponses) : null;
    return filtrer(exoId, passageFigeServeur);
  }
  return filtrer(exoId, cacheConfirme) ?? filtrer(exoId, passageFigeServeur);
}

/**
 * Le bouton n'est offert que pendant une reprise ET avec une preuve serveur de
 * l'envoi initial ; une ligne de révision orpheline ne suffit jamais.
 */
export const sortieRevisionAutorisee = (preuve: { initialSoumisServeur: boolean; passageFigeServeur: boolean }, enRevision: boolean) =>
  enRevision && (preuve.initialSoumisServeur || preuve.passageFigeServeur);
