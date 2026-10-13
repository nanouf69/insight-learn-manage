import { describe, expect, it } from "vitest";
import {
  applyPratiqueUnlockElearning,
  computeUnlockState,
  isModuleLocked,
} from "@/lib/moduleUnlockLogic";

const PRATIQUE_IDS = new Set([6, 8]);

// Parcours VTC e-learning simplifié : 26, 2, 3, 4, 35, 5, 60, 70, 8
const VTC_MODULES = [26, 2, 3, 4, 35, 5, 60, 70, 8].map((id) => ({ id }));
// Parcours TAXI e-learning simplifié
const TAXI_MODULES = [26, 10, 7, 64, 12, 3, 9, 13, 11, 36, 61, 71, 6].map((id) => ({ id }));

function stateFor(modules: { id: number }[], isElearning: boolean) {
  return computeUnlockState({
    modules,
    completedModuleIds: new Set([26]),
    moduleQuizStatsById: {},
    examBlancStatsById: {},
    isElearning,
  });
}

describe("Module Pratique débloqué pour tous les e-learning (13/10/2026)", () => {
  it("VTC e-learning : le module 8 est débloqué même si les modules précédents ne sont pas terminés", () => {
    const state = stateFor(VTC_MODULES, true);
    expect(isModuleLocked(8, state)).toBe(true);
    applyPratiqueUnlockElearning(state.unlockedModuleIds, VTC_MODULES, true, PRATIQUE_IDS);
    expect(isModuleLocked(8, state)).toBe(false);
    // Aucune progression inventée.
    expect(state.effectivelyCompletedIds.has(8)).toBe(false);
    // Les autres modules restent soumis à la règle séquentielle.
    expect(isModuleLocked(4, state)).toBe(true);
    expect(isModuleLocked(60, state)).toBe(true);
  });

  it("TAXI e-learning : le module 6 est débloqué, les autres restent verrouillés", () => {
    const state = stateFor(TAXI_MODULES, true);
    expect(isModuleLocked(6, state)).toBe(true);
    applyPratiqueUnlockElearning(state.unlockedModuleIds, TAXI_MODULES, true, PRATIQUE_IDS);
    expect(isModuleLocked(6, state)).toBe(false);
    expect(isModuleLocked(36, state)).toBe(true);
    expect(state.effectivelyCompletedIds.has(6)).toBe(false);
  });

  it("hors e-learning : rien ne change (les modules sont déjà tous débloqués)", () => {
    const state = stateFor(VTC_MODULES, false);
    applyPratiqueUnlockElearning(state.unlockedModuleIds, VTC_MODULES, false, PRATIQUE_IDS);
    expect(isModuleLocked(8, state)).toBe(false);
  });

  it("un parcours sans module pratique n'est pas modifié", () => {
    const modules = [26, 2, 3].map((id) => ({ id }));
    const state = stateFor(modules, true);
    const avant = new Set(state.unlockedModuleIds);
    applyPratiqueUnlockElearning(state.unlockedModuleIds, modules, true, PRATIQUE_IDS);
    expect(state.unlockedModuleIds).toEqual(avant);
  });
});
