import { expect, it } from 'vitest';
import { jourParis, sessionFormationActuelle } from './sessionsActuelles';
it('inclut les trois périodes de formation réelles au 11 novembre indépendamment du statut', () => {
  for (const [debut, fin] of [['2026-10-26','2026-11-16'],['2026-11-02','2026-11-13']])
    expect(sessionFormationActuelle({debut,fin,typeSession:'theorique'},'2026-11-11')).toBe(true);
});
it('dates CRM inclusives et examen ponctuel exclu', () => {
  const s={debut:'2026-11-02',fin:'2026-11-13',typeSession:'theorique'};
  expect(sessionFormationActuelle(s,'2026-11-02')).toBe(true);
  expect(sessionFormationActuelle(s,'2026-11-13')).toBe(true);
  expect(sessionFormationActuelle(s,'2026-11-14')).toBe(false);
  expect(sessionFormationActuelle({...s,typeSession:'examen'},'2026-11-11')).toBe(false);
});
it('jour de référence Europe/Paris, pas UTC',()=>expect(jourParis(new Date('2026-11-10T23:30:00Z'))).toBe('2026-11-11'));