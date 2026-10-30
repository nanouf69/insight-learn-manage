import type { QcmBilanTa } from '@/data/bilan-ta/qcmLocauxBilanTa';

const STATION = "Que doit faire un chauffeur TAXI qui n'est pas en course et qui stationne sur une place de TAXI ?";
const OBJET = "Je dispose d'une licence de Villefranche, je souhaite déposer un article trouvé dans mon véhicule à Lyon 8, je le dépose à :";
const STATION_D = 'La station doit avoir 6 places minimum, 1/3 de la partie arrière peut être utilisée, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord';

/** Optional practice only: never mutate the copied TA bank or a saved answer. */
export function reponsesLocalesAcceptees(q: QcmBilanTa): string[] {
  if (q.id === 35 && q.enonce === STATION && q.choix.some(c => c.lettre === 'D' && c.texte === STATION_D)) return ['D'];
  return q.choix.filter(c => c.correct).map(c => c.lettre);
}

export function feedbackLocalVerifie(q: QcmBilanTa): string | null {
  if (q.id === 35 && q.enonce === STATION) return "Corrigé vérifié : D. Station de 6 places ou plus, utilisation du tiers arrière de la station, lumineux allumé, disque sur le tableau de bord, 2 heures maximum. Il ne s’agit pas d’un tiers des places libres. Support TAXI Locale partie 1, pages 8–9 ; arrêté Rhône du 21 septembre 2026, article 10, page 17 du recueil.";
  if (q.id === 29 && q.enonce === OBJET) return "Attention : cette question concerne le dépôt d’un objet oublié, pas la dépose du client. Le livre TAXI (page PDF 33) et les supports locaux indiquent le guichet Métropole. L’arrêté Rhône du 21 septembre 2026, article 9 (page 17 du recueil), prévoit le service des objets trouvés de la mairie de dépose ou l’autorité de délivrance de l’ADS, au plus vite et sous 72 heures. Il ne dit pas « lieu de prise en charge ». L’énoncé ne précise pas où le client a été déposé : les choix supplémentaires restent à arbitrer, sans les déclarer faux au titre du texte.";
  return null;
}