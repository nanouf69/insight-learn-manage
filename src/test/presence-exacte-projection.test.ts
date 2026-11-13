import { describe,it,expect } from 'vitest';
import { projeterMinutesPresenceExacte } from '@/lib/presenceExacteProjection';
const signe={date:'2026-09-17',debut:1020,fin:1110};
const recu={id:'r',date:'2026-09-17',debut:1110,fin:1260,rapprochements:[{id:'validation90'}]};
describe('Présence exacte sans addition double',()=>{
 it('17/09 : 90 minutes signées + 150 minutes confirmées = 240',()=>expect(projeterMinutesPresenceExacte([signe],[recu]).minutes).toBe(240));
 it('la signature acquise n’est jamais remplacée par une présence',()=>expect(projeterMinutesPresenceExacte([signe],[{...recu,debut:1020,fin:1110}]).minutes).toBe(90));
 it('un reçu répété ne double pas les heures',()=>expect(projeterMinutesPresenceExacte([signe],[recu,recu]).minutes).toBe(240));
 it('18/09 : 90 + 150 = 240, pas 240 + ancien 240',()=>{
  const r=projeterMinutesPresenceExacte([],[{...recu,date:'2026-09-18',debut:1020,fin:1110,rapprochements:[{id:'validation240'}]},{...recu,id:'r2',date:'2026-09-18',rapprochements:[]}]);
  expect(r.minutes).toBe(240); expect([...r.remplacees]).toEqual(['validation240']);
 });
 it('les 390 minutes de signatures manquantes ne deviennent pas des signatures',()=>expect(projeterMinutesPresenceExacte([],[recu]).minutes).toBe(150));
 it('horaires invalides refusés plutôt qu’un zéro technique',()=>expect(()=>projeterMinutesPresenceExacte([],[{...recu,fin:100}])).toThrow());
});