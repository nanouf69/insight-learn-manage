import { describe, it, expect } from 'vitest';
import { datesExamenChoisissables, derniereSessionExamenPassee, datesExamenResultatsChoisissables } from '@/lib/examDatesChoix';
import { trouverExamenTheorique } from '@/lib/examDatesConfig';

describe('Choix des dates non passées', () => {
  it('résultats : le 23 novembre ouvre le 17 novembre et le conserve dans les deux sélecteurs', () => {
    const now = new Date('2026-11-23T16:30:00Z');
    expect(derniereSessionExamenPassee(now)?.date).toBe('17 novembre 2026');
    expect(datesExamenResultatsChoisissables(now).slice(0, 2).map(d => d.date)).toEqual(['17 novembre 2026', '26 janvier 2027']);
    expect(datesExamenChoisissables(now)[0]?.date).toBe('26 janvier 2027');
  });
  it('la dernière passée avance seulement au lendemain Paris, sans inclure le jour courant', () => {
    expect(derniereSessionExamenPassee(new Date('2027-01-26T22:59:00Z'))?.date).toBe('17 novembre 2026');
    expect(derniereSessionExamenPassee(new Date('2027-01-26T23:00:00Z'))?.date).toBe('26 janvier 2027');
  });
  it('aucune session passée n’est inventée avant le catalogue', () => {
    expect(derniereSessionExamenPassee(new Date('2026-01-01T12:00:00Z'))).toBeNull();
  });
  it('le 30 octobre propose novembre et les six dates 2027, jamais juillet/septembre', () => {
    expect(datesExamenChoisissables(new Date('2026-10-30T11:05:00Z')).map(d => d.date)).toEqual([
      '17 novembre 2026', '26 janvier 2027', '30 mars 2027', '25 mai 2027', '20 juillet 2027', '28 septembre 2027', '7 décembre 2027',
    ]);
  });
  it('garde la date du jour selon Paris et la retire dès le lendemain parisien', () => {
    expect(datesExamenChoisissables(new Date('2026-11-17T22:59:00Z'))[0]?.date).toBe('17 novembre 2026');
    expect(datesExamenChoisissables(new Date('2026-11-17T23:00:00Z'))[0]?.date).toBe('26 janvier 2027');
  });
  it('conserve les anciennes sessions dans le catalogue historique', () => {
    expect(trouverExamenTheorique('2026-09-29')?.date).toBe('29 septembre 2026');
    expect(datesExamenChoisissables(new Date('2028-01-01T12:00:00Z'))).toEqual([]);
  });
});