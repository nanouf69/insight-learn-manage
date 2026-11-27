export interface PrestationCatalogueDevis {
  label: string;
  designation: string;
  prix: number | null;
}

// Aucun tarif communiqué pour ces prestations : saisie explicite dans le devis.
export const SERVICES_CATALOGUE_DEVIS: PrestationCatalogueDevis[] = [
  { label: "Frais d'examen", designation: "Frais d'examen", prix: null },
  { label: "Location de voiture VTC", designation: "Location de voiture VTC", prix: null },
  { label: "Location de voiture TAXI", designation: "Location de voiture TAXI", prix: null },
  { label: "Formation et location de voiture TAXI", designation: "Formation et location de voiture TAXI", prix: null },
  { label: "Formation et location de voiture VTC", designation: "Formation et location de voiture VTC", prix: null },
];

export function appliquerPrestationDevis<T extends { designation: string; prixUnitaire: number }>(
  ligne: T,
  prestation: PrestationCatalogueDevis,
): T {
  return { ...ligne, designation: prestation.designation, prixUnitaire: prestation.prix ?? 0 };
}