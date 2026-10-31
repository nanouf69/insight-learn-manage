import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { appliquerDerogationsModules } from '@/lib/moduleAccessDerogation';
import { computeUnlockState, isModuleLocked } from '@/lib/moduleUnlockLogic';

const assigned = [26, 2, 3, 4, 35, 5, 8].map(id => ({ id }));
const initial = () => computeUnlockState({ modules: assigned,
  completedModuleIds: new Set([26, 2, 3, 4, 8]), isElearning: true,
  moduleQuizStatsById: {}, examBlancStatsById: { 35: { completed: 5, total: 6 } } });

describe('Kevin : accès individuel sans réalisation fictive', () => {
  it('autorise les sept modules attribués, y compris 35 et 5, sans les valider', () => {
    const state = initial();
    appliquerDerogationsModules(state, assigned, [26, 2, 3, 4, 35, 5, 8]);
    expect(assigned.filter(m => isModuleLocked(m.id, state))).toEqual([]);
    expect([...state.effectivelyCompletedIds]).toEqual([26, 2, 3, 4, 8]);
    expect(state.effectivelyCompletedIds.has(35)).toBe(false);
    expect(state.effectivelyCompletedIds.has(5)).toBe(false);
  });
  it('ne change pas les prérequis d’un autre élève sans droit serveur', () => {
    const state = initial();
    appliquerDerogationsModules(state, assigned, []);
    expect(isModuleLocked(5, state)).toBe(true);
  });
  it('ne donne jamais accès à un module non attribué', () => {
    const state = initial();
    appliquerDerogationsModules(state, assigned, [5, 6, 11]);
    expect(state.unlockedModuleIds.has(5)).toBe(true);
    expect(state.unlockedModuleIds.has(6)).toBe(false);
    expect(state.unlockedModuleIds.has(11)).toBe(false);
  });
});