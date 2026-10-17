import { describe, expect, it } from 'vitest';
import { devisPratiqueDates } from '@/lib/devisPratiqueDates';

const planning = [{ day_time_slots: {
  '2026-10-17': { type: 'taxi' },
  '2026-10-19': { type: 'vtc' },
  '2026-10-22': { type: 'taxi' },
  '2026-10-23': { type: 'taxi' },
}, excluded_days: [] }];

describe('Dates pratiques des devis', () => {
  it('propose les journées TAXI enregistrées sans les journées VTC', () => {
    expect(devisPratiqueDates(planning, 'taxi')).toEqual(['17 octobre 2026', '22 octobre 2026', '23 octobre 2026']);
  });
  it('sépare les journées VTC', () => {
    expect(devisPratiqueDates(planning, 'vtc')).toEqual(['19 octobre 2026']);
  });
  it('conserve le samedi enregistré', () => {
    expect(devisPratiqueDates(planning, 'taxi')).toContain('17 octobre 2026');
  });
  it('retire uniquement les journées exclues et évite les doublons', () => {
    expect(devisPratiqueDates([planning[0], { ...planning[0], excluded_days: ['2026-10-22'] }], 'taxi')).toHaveLength(3);
    expect(devisPratiqueDates([{ ...planning[0], excluded_days: ['2026-10-22'] }], 'taxi')).toEqual(['17 octobre 2026', '23 octobre 2026']);
  });
  it('n’invente pas de filière ou de date depuis une période ancienne', () => {
    expect(devisPratiqueDates([{ day_time_slots: { '2026-02-30': { type: 'taxi' }, '2026-10-22': { matin: '9h-12h' } }, excluded_days: null }], 'taxi')).toEqual([]);
  });
});