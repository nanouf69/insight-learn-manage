import { describe, expect, it } from "vitest";
import {
  applyPratiqueUnlockDerogation,
  computeUnlockState,
  isModuleLocked,
} from "@/lib/moduleUnlockLogic";

const ENZO_CALVO_ID = "96604b15-bd2b-418c-8019-293186c016fb";
const ALLOWED = new Set([ENZO_CALVO_ID]);
const PRATIQUE_IDS = new Set([6, 8]);

// Parcours VTC e-learning simplifié : 26, 2, 3, 4, 35, 5, 60, 70, 8
const VTC_MODULES = [26, 2, 3, 4, 35, 5, 60, 70, 8].map((id) => ({ id }));

function baseState() {
  return computeUnlockState({
    modules: VTC_MODULES,
    completedModuleIds: new Set([26, 2, 3, 4]),
    moduleQuizStatsById: {},
    examBlancStatsById: {},
    isElearning: true,
  });
}

describe("Dérogation module Pratique (accord individuel)", () => {
  it("sans dérogation, le module 8 reste verrouillé si les modules précédents ne sont pas terminés", () => {
    const state = baseState();
    expect(isModuleLocked(8, state)).toBe(true);
  });

  it("Enzo Calvo : le module 8 est débloqué, les autres modules restent verrouillés", () => {
    const state = baseState();
    applyPratiqueUnlockDerogation(state.unlockedModuleIds, VTC_MODULES, ENZO_CALVO_ID, ALLOWED, PRATIQUE_IDS);
    expect(isModuleLocked(8, state)).toBe(false);
    // Les modules 35, 5, 60 restent soumis à la règle séquentielle.
    expect(isModuleLocked(35, state)).toBe(false); // débloqué car 4 terminé
    expect(isModuleLocked(5, state)).toBe(true);
    expect(isModuleLocked(60, state)).toBe(true);
    // Aucune progression inventée : le module 8 n'est pas marqué terminé.
    expect(state.effectivelyCompletedIds.has(8)).toBe(false);
  });

  it("un autre élève non autorisé ne bénéficie pas de la dérogation", () => {
    const state = baseState();
    applyPratiqueUnlockDerogation(state.unlockedModuleIds, VTC_MODULES, "autre-eleve-id", ALLOWED, PRATIQUE_IDS);
    expect(isModuleLocked(8, state)).toBe(true);
  });

  it("sans identifiant apprenant, rien ne change", () => {
    const state = baseState();
    applyPratiqueUnlockDerogation(state.unlockedModuleIds, VTC_MODULES, null, ALLOWED, PRATIQUE_IDS);
    expect(isModuleLocked(8, state)).toBe(true);
  });

  it("parcours TAXI : seul le module 6 (pratique) est concerné", () => {
    const taxiModules = [26, 10, 7, 64, 12, 3, 9, 13, 11, 36, 61, 71, 6].map((id) => ({ id }));
    const state = computeUnlockState({
      modules: taxiModules,
      completedModuleIds: new Set([26]),
      moduleQuizStatsById: {},
      examBlancStatsById: {},
      isElearning: true,
    });
    expect(isModuleLocked(6, state)).toBe(true);
    applyPratiqueUnlockDerogation(state.unlockedModuleIds, taxiModules, ENZO_CALVO_ID, ALLOWED, PRATIQUE_IDS);
    expect(isModuleLocked(6, state)).toBe(false);
    expect(isModuleLocked(36, state)).toBe(true);
  });
});
