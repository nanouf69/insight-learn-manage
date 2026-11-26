import { describe, expect, it } from 'vitest';
import { totalFactureCommune, verifierFactureCommune } from '@/lib/comptabilite/factureCommune';
import { factureToDraftShape } from '@/lib/pdf/draft-facture';

describe('Facture commune', () => {
  const lignes = [
    { apprenant_id: 'a', stagiaire: 'Alice TEST', designation: 'FC TAXI', montant_ht: 200 },
    { apprenant_id: 'b', stagiaire: 'Bob TEST', designation: 'FC TAXI', montant_ht: 200 },
  ];
  it('accepte deux apprenants distincts et calcule leur total exact', () => {
    expect(verifierFactureCommune(lignes)).toBeNull();
    expect(totalFactureCommune(lignes)).toBe(400);
  });
  it('accepte plusieurs apprenants', () => {
    const trois = [...lignes, { ...lignes[0], apprenant_id: 'c', montant_ht: 120.25 }];
    expect(verifierFactureCommune(trois)).toBeNull();
    expect(totalFactureCommune(trois)).toBe(520.25);
  });
  it('refuse un apprenant seul ou un doublon', () => {
    expect(verifierFactureCommune(lignes.slice(0, 1))).not.toBeNull();
    expect(verifierFactureCommune([lignes[0], lignes[0]])).not.toBeNull();
  });
  it('refuse les montants invalides et conserve les centimes', () => {
    for (const montant of [0, -1, NaN, Infinity, 1.001]) {
      expect(verifierFactureCommune([lignes[0], { ...lignes[1], montant_ht: montant }])).not.toBeNull();
    }
    expect(totalFactureCommune([{ montant_ht: 0.1 }, { montant_ht: 0.2 }])).toBe(0.3);
  });
  it('le PDF conserve toutes les lignes nominatives sans modifier la source', () => {
    const facture = { numero: 'TEST', montant_ht: 400, tva_taux: 0, lignes_apprenants: lignes };
    const avant = JSON.stringify(facture);
    const pdf = factureToDraftShape(facture);
    expect(pdf.lignes.map(l => l.stagiaire)).toEqual(['Alice TEST', 'Bob TEST']);
    expect(pdf.lignes.map(l => l.prixUnitaire)).toEqual([200, 200]);
    expect(pdf.lignes.every(l => l.tvaType === 'EXO')).toBe(true);
    expect(JSON.stringify(facture)).toBe(avant);
  });
  it('une facture individuelle garde son montant et sa forme antérieure', () => {
    const pdf = factureToDraftShape({ montant_ht: 200, tva_taux: 0 });
    expect(pdf.lignes).toHaveLength(1);
    expect(pdf.lignes[0].prixUnitaire).toBe(200);
  });
});