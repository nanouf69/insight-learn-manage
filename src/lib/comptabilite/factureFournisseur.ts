export interface DateFactureFournisseur {
  date_facture?: string | null;
  created_at: string;
}

/** La date comptable affichée est celle de la pièce, jamais la date technique d’enregistrement. */
export function dateEmissionFactureFournisseur(facture: DateFactureFournisseur): string {
  return facture.date_facture ?? facture.created_at;
}
