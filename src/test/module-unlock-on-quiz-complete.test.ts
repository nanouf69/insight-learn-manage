// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  computeUnlockState,
  isModuleLocked,
} from "@/lib/moduleUnlockLogic";

/**
 * Non-regression test for the bug where module N+1 stayed locked even though
 * module N had all its quizzes completed (15/15) but no row in
 * apprenant_module_completion.
 *
 * Scenario reproduces the screenshot reported by the user:
 *   - Module 1 (Intro TAXI): completed
 *   - Module 2 (Cours et exercices TAXI): 15/15 quiz completed, no completion row
 *   - Module 3 (Connaissances de la ville TAXI): should be UNLOCKED
 */
describe("Module unlocking — quiz-based completion (TAXI e-learning)", () => {
  const modules = [
    { id: 26 }, // Intro TAXI
    { id: 2 }, // Cours et exercices TAXI
    { id: 3 }, // Connaissances de la ville TAXI
    { id: 4 }, // Module suivant
  ];

  it("unlocks module 3 when module 2 has 15/15 quizzes done (no completion row)", () => {
    const state = computeUnlockState({
      modules,
      completedModuleIds: new Set([26]), // only intro recorded
      moduleQuizStatsById: {
        2: { completedQuizzes: 15, totalQuizzes: 15 },
      },
      examBlancStatsById: {},
      isElearning: true,
    });

    expect(state.effectivelyCompletedIds.has(2)).toBe(true);
    expect(state.unlockedModuleIds.has(3)).toBe(true);
    expect(isModuleLocked(3, state)).toBe(false);
  });

  it("keeps module 3 locked when module 2 quizzes are NOT all done", () => {
    const state = computeUnlockState({
      modules,
      completedModuleIds: new Set([26]),
      moduleQuizStatsById: {
        2: { completedQuizzes: 14, totalQuizzes: 15 },
      },
      examBlancStatsById: {},
      isElearning: true,
    });

    expect(state.effectivelyCompletedIds.has(2)).toBe(false);
    expect(isModuleLocked(3, state)).toBe(true);
  });

  it("keeps module 4 locked when module 3 not yet completed", () => {
    const state = computeUnlockState({
      modules,
      completedModuleIds: new Set([26]),
      moduleQuizStatsById: {
        2: { completedQuizzes: 15, totalQuizzes: 15 },
      },
      examBlancStatsById: {},
      isElearning: true,
    });

    // Module 3 is unlocked, but not yet completed → module 4 stays locked.
    expect(isModuleLocked(3, state)).toBe(false);
    expect(isModuleLocked(4, state)).toBe(true);
  });

  it("still works via apprenant_module_completion row alone (legacy path)", () => {
    const state = computeUnlockState({
      modules,
      completedModuleIds: new Set([26, 2]), // explicit completion row
      moduleQuizStatsById: {},
      examBlancStatsById: {},
      isElearning: true,
    });

    expect(isModuleLocked(3, state)).toBe(false);
  });

  it("présentiel: all modules unlocked regardless of completion", () => {
    const state = computeUnlockState({
      modules,
      completedModuleIds: new Set(),
      moduleQuizStatsById: {},
      examBlancStatsById: {},
      isElearning: false,
    });

    modules.forEach((m) => {
      expect(isModuleLocked(m.id, state)).toBe(false);
    });
  });

  it("requires ALL exams done when module has exam stats", () => {
    const modulesWithExam = [{ id: 26 }, { id: 36 }, { id: 99 }];
    const partial = computeUnlockState({
      modules: modulesWithExam,
      completedModuleIds: new Set([26]),
      moduleQuizStatsById: {},
      examBlancStatsById: {
        36: { completed: 3, total: 5 },
      },
      isElearning: true,
    });
    expect(isModuleLocked(99, partial)).toBe(true);

    const full = computeUnlockState({
      modules: modulesWithExam,
      completedModuleIds: new Set([26]),
      moduleQuizStatsById: {},
      examBlancStatsById: {
        36: { completed: 5, total: 5 },
      },
      isElearning: true,
    });
    expect(isModuleLocked(99, full)).toBe(false);
  });
});
