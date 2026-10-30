import type { QcmBilanTa } from '@/data/bilan-ta/qcmLocauxBilanTa';

const STATION = "Que doit faire un chauffeur TAXI qui n'est pas en course et qui stationne sur une place de TAXI ?";
const OBJET_OUBLIE = 'Un client a oublié un objet dans le véhicule TAXI, où dois-je le déposer ?';
export const OBJETS_METROPOLE_REFERENCE = "Après chaque course et avant que les clients se soient éloignés, le conducteur du taxi doit s’assurer que ceux-ci n’ont rien oublié dans son véhicule. Tout objet découvert après le départ des clients doit être signalé immédiatement et déposé obligatoirement dans la limite de 72h au Service Taxis de la Métropole de Lyon.";
const SOURCE_OBJETS = "Page officielle Métropole de Lyon, Conducteurs de taxi, rubrique Objets trouvés ; arrêté métropolitain du 27 novembre 2024, article 6, page 5 (dépôt sous 72h au guichet de l’unité taxis).";
const STATION_D = 'La station doit avoir 6 places minimum, 1/3 de la partie arrière peut être utilisée, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord';

/** Optional practice only: never mutate the copied TA bank or a saved answer. */
export function reponsesLocalesAcceptees(q: QcmBilanTa): string[] {
  if (q.id === 35 && q.enonce === STATION && q.choix.some(c => c.lettre === 'D' && c.texte === STATION_D)) return ['D'];
  return q.choix.filter(c => c.correct).map(c => c.lettre);
}

export function feedbackLocalVerifie(q: QcmBilanTa): string | null {
  if (q.id === 35 && q.enonce === STATION) return "Corrigé vérifié : D. Station de 6 places ou plus, utilisation du tiers arrière de la station, lumineux allumé, disque sur le tableau de bord, 2 heures maximum. Il ne s’agit pas d’un tiers des places libres. Support TAXI Locale partie 1, pages 8–9 ; arrêté Rhône du 21 septembre 2026, article 10, page 17 du recueil.";
  if (q.id === 20 && q.enonce === OBJET_OUBLIE) return `${OBJETS_METROPOLE_REFERENCE} ${SOURCE_OBJETS} Le choix B conserve le corrigé préfectoral historique (mairie de dépose ou autorité de délivrance de l’ADS, sous 72 heures : arrêté Rhône du 21 septembre 2026, article 9). Ce choix ne décrit pas à lui seul la consigne métropolitaine ci-dessus. Aucun choix ni résultat enregistré n’est réécrit. Le texte dit avant que les clients se soient éloignés, pas avant leur descente ; il ne prévoit pas qu’un simple dépôt au lieu de prise en charge ou une remise au client remplace cette procédure après départ.`;
  return null;
}