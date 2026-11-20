/** Un devis n'inclut les pages du contrat que si le mode « devis valant contrat » est activé ET le contrat est complet. Jamais de brouillon dans un devis. */
export function pagesContratDansDevis(modeActif: boolean, financementPersonnel: boolean, contratComplet: boolean): boolean {
  return modeActif && financementPersonnel && contratComplet;
}
