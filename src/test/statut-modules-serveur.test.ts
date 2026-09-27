// @vitest-environment node
import { describe, it, expect } from "vitest";
import { computeUnlockState, getLearnerModuleDisplayState } from "@/lib/moduleUnlockLogic";

describe("Statut des modules décidé par le serveur", () => {
  it("toutes les activités remises sans validation serveur : Validation en cours, jamais Terminé", () => {
    const s = getLearnerModuleDisplayState({ loaded: true, serverCompleted: false, hasProgress: true, quizStats: { completedQuizzes: 6, totalQuizzes: 6 } });
    expect(s.status).toBe("validation_en_cours");
    expect(s.isDone).toBe(false);
  });
  it("examens blancs 6/6 côté élève sans serveur : pas Terminé", () => {
    const s = getLearnerModuleDisplayState({ loaded: true, serverCompleted: false, hasProgress: true, examStats: { completed: 6, total: 6 } });
    expect(s.isDone).toBe(false);
  });
  it("Terminé serveur : jamais rétrogradé", () => {
    const s = getLearnerModuleDisplayState({ loaded: true, serverCompleted: true, hasProgress: false, examStats: { completed: 2, total: 6 } });
    expect(s.status).toBe("termine");
  });
  it("compteur Terminé = serveur seul ; le module suivant n'est pas bloqué pendant la validation", () => {
    const u = computeUnlockState({
      modules: [{ id: 1 }, { id: 2 }, { id: 3 }],
      completedModuleIds: new Set([1]),
      moduleQuizStatsById: { 2: { completedQuizzes: 3, totalQuizzes: 3 } },
      examBlancStatsById: {},
      isElearning: true,
      introModuleIds: new Set(),
      alwaysUnlockedIds: new Set(),
    });
    expect([...u.effectivelyCompletedIds]).toEqual([1]);
    expect(u.unlockedModuleIds.has(3)).toBe(true);
  });
});
