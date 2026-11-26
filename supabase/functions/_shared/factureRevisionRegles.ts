export const PRESTATIONS_FACTURE = [
  'Formation VTC', 'Formation VTC e-learning', 'Formation TAXI',
  'Formation TAXI e-learning', 'Formation TAXI passerelle',
  'Formation VTC passerelle', 'Formation continue TAXI',
  'Formation continue VTC', 'Formation mobilité TAXI',
] as const;

export function notificationFacture(avant: {numero: string}, apres: {numero: string; statut?: string | null}) {
  if (apres.statut === 'annulee') return {
    sujet: `Facture annulée — ${apres.numero}`,
    message: `La facture n° ${apres.numero} est annulée.`,
    annulation: true,
  };
  return {
    sujet: `Facture modifiée — ${apres.numero}`,
    message: `Veuillez trouver ci-joint la facture modifiée n° ${apres.numero}. Elle remplace l’ancienne facture n° ${avant.numero}.`,
    annulation: false,
  };
}

export function envoiFactureAutorise(statut: string) { return statut === 'a_envoyer'; }