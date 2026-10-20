// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { repriseAutorisee, MAX_REPRISES_QRC } from '../../supabase/functions/_shared/qrcIaReprise';
const now = Date.parse('2026-10-20T08:30:00Z');
describe('Reprise QRC contrôlée', () => {
  it('503 terminé autorise reprise après délai, jamais immédiate', () => {
    expect(repriseAutorisee('erreur',503,'2026-10-19T14:03:44Z','2026-10-19T14:00:44Z',false,now)).toBe(true);
    expect(repriseAutorisee('erreur',503,new Date(now).toISOString(),'2026-10-19T14:00:44Z',false,now)).toBe(false);
  });
  it('verrou ancien requiert interruption confirmée, verrou actif jamais repris', () => {
    expect(repriseAutorisee('en_cours',null,null,'2026-10-19T14:03:53Z',false,now)).toBe(false);
    expect(repriseAutorisee('en_cours',null,null,'2026-10-19T14:03:53Z',true,now)).toBe(true);
    expect(repriseAutorisee('en_cours',null,null,new Date(now).toISOString(),true,now)).toBe(false);
  });
  it('déjà corrigée, refus et crédits jamais réessayés', () => {
    for(const status of [200,400,401,402,403,404,499]) expect(repriseAutorisee('erreur',status,'2026-10-19T14:03:44Z','2026-10-19T14:00:44Z',true,now)).toBe(false);
    expect(repriseAutorisee('appliquee',200,'2026-10-19T14:03:44Z','2026-10-19T14:00:44Z',true,now)).toBe(false);
    expect(MAX_REPRISES_QRC).toBe(2);
  });
});