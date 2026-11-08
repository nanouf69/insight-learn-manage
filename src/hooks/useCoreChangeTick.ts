import { useLearnerResultRefresh } from "./useLearnerResultRefresh";

/**
 * Compteur incrémenté à chaque correction / révision / publication serveur
 * d'un passage du nouveau système pour cet apprenant (temps réel, sans
 * rafraîchissement périodique). Les écrans l'ajoutent à leurs dépendances
 * pour relire immédiatement le même état serveur.
 */
export function useCoreChangeTick(apprenantId: string | null | undefined): number {
  return useLearnerResultRefresh(apprenantId);
}
