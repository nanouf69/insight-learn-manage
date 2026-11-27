// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SERVICES_CATALOGUE_DEVIS, appliquerPrestationDevis } from '@/lib/devisServicesCatalogue';

describe('Prestations supplémentaires du catalogue devis', () => {
  it.each([
    "Frais d'examen",
    'Location de voiture VTC',
    'Location de voiture TAXI',
    'Formation et location de voiture TAXI',
    'Formation et location de voiture VTC',
  ])('%s : disponible sans tarif inventé ni reprise du prix précédent', (label) => {
    const prestation = SERVICES_CATALOGUE_DEVIS.find(p => p.label === label);
    expect(prestation).toBeDefined();
    if (!prestation) throw new Error('Prestation absente');
    expect(prestation.prix).toBeNull();
    const ligne = { id: 'ligne-fictive', quantite: 2, designation: 'Ancienne prestation', prixUnitaire: 1799 };
    expect(appliquerPrestationDevis(ligne, prestation)).toEqual({
      id: 'ligne-fictive', quantite: 2, designation: label, prixUnitaire: 0,
    });
    expect(ligne.prixUnitaire).toBe(1799);
    expect(ligne.designation).toBe('Ancienne prestation');
  });

  it('conserve le tarif communiqué pour les formations existantes', () => {
    expect(appliquerPrestationDevis(
      { designation: 'Ancien', prixUnitaire: 200 },
      { label: 'Formation existante', designation: 'Formation existante', prix: 1099 },
    ).prixUnitaire).toBe(1099);
  });
});