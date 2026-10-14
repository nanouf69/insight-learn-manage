/**
 * GARDE DE CLÔTURE D'UNE MATIÈRE D'EXAMEN BLANC (pur, sans écriture).
 *
 * Incident MAJSAK 13–14/10/2026 : une matière a été écrite « terminée » avec
 * reponses = {} alors que les réponses n'étaient pas encore relues et que le
 * routage du passage n'était pas résolu. Cette garde décide, AVANT toute
 * écriture, ce que la clôture a le droit de faire :
 *  - "attendre"        : chargement des réponses ou routage pas terminé ;
 *  - "deja_terminee"   : la ligne serveur de CETTE clé est déjà terminée →
 *                        aucune écriture (jamais de réécriture d'un passage clos) ;
 *  - "sans_reponse"    : aucune réponse réellement saisie → aucune ligne
 *                        terminale vide, aucune note fabriquée ; statut affiché
 *                        explicitement (« temps écoulé sans réponse ») ;
 *  - "finaliser"       : des réponses existent, la finalisation normale part.
 */
export type DecisionCloture = "attendre" | "deja_terminee" | "sans_reponse" | "finaliser";

export function deciderCloture(input: {
  reponsesChargees: boolean;
  routageResolu: boolean;
  ligneServeurTerminee: boolean;
  nbReponsesSaisies: number;
}): DecisionCloture {
  if (!input.reponsesChargees || !input.routageResolu) return "attendre";
  if (input.ligneServeurTerminee) return "deja_terminee";
  if (Math.max(0, input.nbReponsesSaisies | 0) === 0) return "sans_reponse";
  return "finaliser";
}

/** Nombre de réponses réellement renseignées (QCM non vide, texte non blanc). */
export function compterReponsesSaisies(reponses: Record<string, unknown> | null | undefined): number {
  return Object.values(reponses ?? {}).filter((v) =>
    Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" : v != null,
  ).length;
}

/**
 * Les résultats pré-chargés d'une reprise doivent appartenir à la MÊME
 * tentative que le passage repris. Sinon une matière déjà terminée dans le
 * passage repris paraît « à faire » et s'ouvre sur une clé déjà close dont le
 * chrono est expiré (cascade MAJSAK T3P du 14/10).
 */
export function resultatsDuPassage<T>(rows: T[], tentative: number, getAttempt: (row: T) => number): T[] {
  return (rows ?? []).filter((row) => row != null && getAttempt(row) === tentative);
}
