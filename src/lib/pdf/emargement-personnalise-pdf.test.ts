import { describe, it, expect } from 'vitest';
import { calculEmargementPerso, datesEmargement } from './emargement-personnalise-pdf';

describe('émargement personnalisé', () => {
  it('compte uniquement les jours choisis', () => {
    // 02/11/2026 lundi → 08/11 dimanche, lun-ven
    expect(datesEmargement('2026-11-02', '2026-11-08', [1, 2, 3, 4, 5])).toHaveLength(5);
  });
  it('heures par jour et total', () => {
    const r = calculEmargementPerso({ dateDebut: '2026-11-02', dateFin: '2026-11-03', joursSemaine: [1, 2], creneaux: [{ debut: '09:00', fin: '12:00' }, { debut: '13:00', fin: '17:00' }], formateur: 'X', formation: 'FC' });
    expect(r.parJour).toBe(420); expect(r.total).toBe(840);
  });
  it('refuse fin avant début', () => {
    expect(() => calculEmargementPerso({ dateDebut: '2026-11-02', dateFin: '2026-11-02', joursSemaine: [1], creneaux: [{ debut: '12:00', fin: '09:00' }], formateur: 'X', formation: 'F' })).toThrow();
  });
});
