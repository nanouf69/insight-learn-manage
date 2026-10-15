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
/**
 * Même définition que la garde serveur `eb_reponses_renseignees` (P0530) :
 * une réponse compte seulement si elle contient, à n'importe quelle
 * profondeur, un texte non vide, un nombre ou un booléen. Sinon le
 * navigateur croyait avoir des réponses (`[""]`, `{}`, `[null]`) et tentait
 * une clôture que le serveur refusait (KEVIN FERNANDES, 14/10, P0530).
 */
export function valeurRenseignee(v: unknown): boolean {
  if (typeof v === "string") return /\S/.test(v);
  if (typeof v === "number" || typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.some(valeurRenseignee);
  if (v && typeof v === "object") return Object.values(v as Record<string, unknown>).some(valeurRenseignee);
  return false;
}

export function compterReponsesSaisies(reponses: Record<string, unknown> | null | undefined): number {
  return Object.values(reponses ?? {}).filter(valeurRenseignee).length;
}

/**
 * Finalisation après expiration : un refus DÉFINITIF du serveur (ex. P0530)
 * ne doit jamais relancer la finalisation toutes les 15 s — chaque relance
 * réenfilait la même clôture (KEVIN FERNANDES 14/10 : 48 refus P0530 entre
 * 10:33 et 11:16, count=48, last_seen 11:16:04). La file n'est pas touchée.
 */
export function finalisationBloqueeParRefus(
  refus: { exerciceId: string; reason: string } | null | undefined,
  exerciceKey: string,
): boolean {
  return !!refus && refus.exerciceId === exerciceKey && refus.reason !== "frozen";
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
