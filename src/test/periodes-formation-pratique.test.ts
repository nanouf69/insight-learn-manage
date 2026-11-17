import { describe, expect, it } from 'vitest';
import { debutPeriodeExamenPratique, periodesFormationPratique } from '../lib/periodesFormationPratique';

describe('Périodes entraînement pratique', () => {
  it('commence le lendemain du théorique et finit la veille du premier jour pratique', () => {
    expect(periodesFormationPratique().find(p => p.examenTheorique === '17 novembre 2026')).toEqual({
      examenTheorique: '17 novembre 2026', examenPratique: 'Du 16 au 23 decembre 2026',
      debut: '2026-11-18', fin: '2026-12-15',
    });
  });
  it('associe septembre à novembre, pas à une épreuve pratique passée', () => {
    expect(periodesFormationPratique().find(p => p.examenTheorique === '29 septembre 2026')).toMatchObject({
      debut: '2026-09-30', fin: '2026-11-01', examenPratique: 'Du 2 au 13 novembre 2026',
    });
  });
  it('conserve les périodes historiques sans inventer celles de 2027', () => {
    const periods = periodesFormationPratique();
    expect(periods.find(p => p.examenTheorique === '27 janvier 2026')).toMatchObject({ debut: '2026-01-28', fin: '2026-02-22' });
    expect(periods.find(p => p.examenTheorique === '26 janvier 2027')).toBeUndefined();
    expect(debutPeriodeExamenPratique('Début janvier 2027')).toBeNull();
  });
  it('lit les deux formats de dates et refuse une date impossible', () => {
    expect(debutPeriodeExamenPratique('Du 1er au 11 septembre 2026')).toBe('2026-09-01');
    expect(debutPeriodeExamenPratique('Du 29 juin au 7 juillet 2026')).toBe('2026-06-29');
    expect(debutPeriodeExamenPratique('Du 31 au 32 février 2026')).toBeNull();
  });
});