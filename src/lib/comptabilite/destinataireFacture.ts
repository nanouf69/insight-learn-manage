interface FinanceurFacture {
  type_financeur: string;
  email_facturation?: string | null;
  contact_email?: string | null;
}
interface StagiaireFacture {
  email?: string | null;
  facture_contact_email?: string | null;
  societe_nom?: string | null;
  organisme_financeur?: string | null;
}

export function destinataireFactureParDefaut(
  financeur: FinanceurFacture | null,
  stagiaire: StagiaireFacture | null,
  financement: string,
): string {
  const personnel = (type: string) => ['particulier', 'personnel'].includes(type.toLowerCase());
  if (financeur && !personnel(financeur.type_financeur)) {
    return financeur.email_facturation?.trim() || financeur.contact_email?.trim() || stagiaire?.facture_contact_email?.trim() || '';
  }
  if (!personnel(financement) && (stagiaire?.societe_nom || stagiaire?.organisme_financeur || stagiaire?.facture_contact_email)) {
    return stagiaire.facture_contact_email?.trim() || '';
  }
  return stagiaire?.email?.trim() || '';
}