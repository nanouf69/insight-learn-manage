export interface LigneFactureCommune {
  apprenant_id: string;
  stagiaire: string;
  designation: string;
  montant_ht: number;
}

export function totalFactureCommune(lignes: Pick<LigneFactureCommune, 'montant_ht'>[]): number {
  return lignes.reduce((total, ligne) => total + Math.round(ligne.montant_ht * 100), 0) / 100;
}

export function verifierFactureCommune(lignes: Pick<LigneFactureCommune, 'apprenant_id' | 'montant_ht'>[]): string | null {
  if (lignes.length < 2) return 'Sélectionnez au moins deux apprenants.';
  if (new Set(lignes.map(l => l.apprenant_id)).size !== lignes.length) return 'Un apprenant ne peut figurer qu’une fois.';
  if (lignes.some(l => !Number.isFinite(l.montant_ht) || l.montant_ht <= 0 || Math.round(l.montant_ht * 100) / 100 !== l.montant_ht)) {
    return 'Chaque montant doit être positif, avec deux décimales au maximum.';
  }
  return null;
}

export function lignesFactureCommune(facture: { lignes_apprenants?: unknown }): LigneFactureCommune[] {
  if (!Array.isArray(facture.lignes_apprenants)) return [];
  return facture.lignes_apprenants as LigneFactureCommune[];
}