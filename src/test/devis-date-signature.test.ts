import { describe, expect, it } from 'vitest';
import { devisDatesSignature, formatDevisDate } from '@/lib/devisDatesSignature';

describe('Date modifiable du devis à signer', () => {
  it('conserve la date choisie avant envoi et les dates de formation', () => {
    expect(devisDatesSignature('2026-10-16', '2026-10-24', '22 octobre 2026')).toEqual({
      date_devis: '2026-10-16', date_validite: '2026-10-24', dates_formation: '22 octobre 2026',
    });
  });
  it('affiche la même date française sans substituer la date du jour', () => {
    expect(formatDevisDate('2026-10-16')).toBe('16/10/2026');
  });
  it('refuse une date vide avant envoi', () => {
    expect(() => devisDatesSignature('', '2026-10-24', '22 octobre 2026')).toThrow();
  });
  it('ne fabrique aucune date pour les anciens devis sans date', () => {
    expect(formatDevisDate(null)).toBe('');
  });
  it('laisse les dates de formation absentes lorsqu’aucune date n’est choisie dans le devis', () => {
    expect(devisDatesSignature('2026-10-17', '2026-10-24', '').dates_formation).toBeNull();
  });
});