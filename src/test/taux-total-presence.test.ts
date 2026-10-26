import { describe, expect, it } from 'vitest';
import { tauxTotalPresence } from '@/lib/tauxTotalPresence';

describe('total présence session + pratique', () => {
  it.each([['soir',40],['journée',60],['TAXI',90],['TA',30]])('%s complet donne 100 %%', (_, heures) => {
    const r = tauxTotalPresence({ session: { faites: heures, prevues: heures }, pratique: { faites: 6, prevues: 6 } });
    expect(r?.pct).toBe(100);
    expect(r?.prevues).toBe(heures + 6);
  });
  it('sans inscription pratique : session 60/60 mais total 60/66', () => {
    const r = tauxTotalPresence({session:{faites:60,prevues:60},pratique:{faites:0,prevues:0}});
    expect(r?.prevues).toBe(66);
    expect(r?.pct).toBeCloseTo(90.909);
  });
  it('taux présentiel = heures signées / heures prévues : 60 h signées sur 66 h prévues ne fait jamais 50 %', () => {
    // La carte « Taux présentiel » utilise ce pct (jamais la moyenne simple 100 % + 0 % = 50 %).
    const r = tauxTotalPresence({session:{faites:60,prevues:60},pratique:{faites:0,prevues:6}});
    expect(r?.faites).toBe(60);
    expect(r?.prevues).toBe(66);
    expect(r?.pct).toBeGreaterThan(50);
    expect(r?.pct).toBeCloseTo(90.909);
  });
  it('surplus théorie ne compense pas pratique manquante', () => {
    expect(tauxTotalPresence({session:{faites:66,prevues:60},pratique:{faites:0,prevues:6}})?.pct).toBeCloseTo(90.909);
  });
  it('respecte une pratique explicitement prévue pour 3 h', () => {
    expect(tauxTotalPresence({session:{faites:40,prevues:40},pratique:{faites:3,prevues:3}})?.prevues).toBe(43);
  });
  it('lecture indisponible ne produit aucun taux', () => {
    expect(tauxTotalPresence(null)).toBeNull();
  });
});