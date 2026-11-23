import { describe, expect, it } from 'vitest';
import { appliquerCapacitePratique, capacitePratique, joursFormationPratique, ecartsJoursPratique } from '@/lib/planningCapacitePratique';

describe('Choix de 3 ou 4 candidats par jour', () => {
  it('20 jours pour 56 VTC et 12 TAXI à quatre : trois jours libres, aucun surplus attribué à une filière', () => {
    expect(ecartsJoursPratique([...Array(14).fill('vtc'), ...Array(3).fill('taxi'), ...Array(3).fill('libre')], 14, 3))
      .toEqual({ vtc: 14, taxi: 3, libres: 3, ecartVtc: 0, ecartTaxi: 0 });
  });
  it('un surplus VTC ne masque pas un manque TAXI', () => {
    expect(ecartsJoursPratique([...Array(16).fill('vtc'), 'taxi'], 14, 3))
      .toMatchObject({ ecartVtc: 2, ecartTaxi: -2, libres: 0 });
  });
  it('distingue un manque VTC et un surplus TAXI', () => {
    expect(ecartsJoursPratique([...Array(12).fill('vtc'), ...Array(4).fill('taxi')], 14, 3))
      .toMatchObject({ ecartVtc: -2, ecartTaxi: 1 });
  });
  it('3 candidats : 56 VTC nécessitent 19 jours', () => {
    expect(joursFormationPratique(56, 3)).toBe(19);
    expect(capacitePratique(3, '2026-11-24')).toBe(3);
  });
  it('4 candidats : 56 VTC nécessitent 14 jours', () => {
    expect(joursFormationPratique(56, 4)).toBe(14);
    expect(capacitePratique(4, '2026-11-24')).toBe(4);
  });
  it('le même choix s’applique aux 12 TAXI : 4 ou 3 jours', () => {
    expect(joursFormationPratique(12, 3)).toBe(4);
    expect(joursFormationPratique(12, 4)).toBe(3);
  });
  it('le choix explicite applique 4 puis 3 aux journées déjà configurées sans muter la source', () => {
    const original = { '2026-11-24': 3, '2026-11-25': 3 };
    const quatre = appliquerCapacitePratique(4, original);
    expect(quatre).toEqual({ '2026-11-24': 4, '2026-11-25': 4 });
    expect(appliquerCapacitePratique(3, quatre)).toEqual(original);
    expect(original['2026-11-24']).toBe(3);
    expect(capacitePratique(4, '2026-11-24', quatre)).toBe(4);
  });
  it('une lecture ne modifie pas les capacités individuelles enregistrées', () => {
    expect(capacitePratique(3, '2026-11-24', { '2026-11-24': 4 })).toBe(4);
    expect(capacitePratique(null)).toBe(3);
    expect(joursFormationPratique(0, 4)).toBe(0);
    expect(joursFormationPratique(5, 4)).toBe(2);
  });
});