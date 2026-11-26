import { lignesFactureCommune } from "./factureCommune";

export interface RattachementFacture {
  apprenant_id: string;
  nom_apprenant: string;
}

export interface FactureAvecRattachements {
  apprenant_id?: string | null;
  lignes_apprenants?: unknown;
  rattachements?: RattachementFacture[] | null;
}

export function apprenantsRattachesFacture(facture: FactureAvecRattachements, noms: Record<string, string> = {}): RattachementFacture[] {
  const resultat = new Map<string, RattachementFacture>();
  if (facture.apprenant_id) resultat.set(facture.apprenant_id, {
    apprenant_id: facture.apprenant_id,
    nom_apprenant: noms[facture.apprenant_id] || "Apprenant initial",
  });
  for (const ligne of lignesFactureCommune(facture)) resultat.set(ligne.apprenant_id, {
    apprenant_id: ligne.apprenant_id, nom_apprenant: ligne.stagiaire,
  });
  for (const lien of facture.rattachements ?? []) {
    if (!resultat.has(lien.apprenant_id)) resultat.set(lien.apprenant_id, lien);
  }
  return Array.from(resultat.values());
}