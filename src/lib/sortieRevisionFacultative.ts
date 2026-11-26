/**
 * « Passer cette correction et continuer » : sortie facultative d'une reprise
 * des questions fausses. Lecture seule : choisit les réponses de la tentative
 * initiale confirmée à réafficher, ou null si aucune preuve fiable (jamais de
 * score recalculé à partir de réponses effacées localement).
 */
export type Reponses = Record<string, string | string[]>;

export function reponsesInitialesPourSortie(
  exoId: number,
  serveur: { status?: string | null; submitted_at?: string | null; reponses?: unknown } | null,
  snapshotLocal: Reponses | null,
): Reponses | null {
  const prefixe = `${exoId}-`;
  const filtrer = (src: Record<string, any>) => {
    const out: Reponses = {};
    for (const [k, v] of Object.entries(src)) if (k.startsWith(prefixe) && v != null) out[k] = v;
    return Object.keys(out).length > 0 ? out : null;
  };
  const soumis = serveur?.status === "submitted";
  if (soumis && serveur!.reponses && typeof serveur!.reponses === "object") {
    const r = filtrer(serveur!.reponses as Record<string, any>);
    if (r) return r;
  }
  return snapshotLocal ? filtrer(snapshotLocal) : null;
}

/** La sortie n'est offerte que pour la reprise d'un quiz initial déjà remis. */
export const sortieRevisionAutorisee = (initialRemis: boolean, enRevision: boolean) => initialRemis && enRevision;
