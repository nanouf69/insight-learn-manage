// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  computeServerCompletedModuleIds,
  computeUnlockState,
  getLearnerModuleDisplayState,
} from "@/lib/moduleUnlockLogic";

// Scénario anonymisé « élève A » (incident du 25/09) : 10 modules, 8 Terminé serveur,
// contenus modifiés depuis (compteurs actuels plus grands), anciennes sous-lignes en cours.
const MODULES = [26, 2, 3, 4, 35, 5, 60, 70, 8, 50].map((id) => ({ id }));
const SERVER_DONE = [26, 2, 3, 4, 35, 5, 70, 8, 50];

describe("Source unique d'affichage apprenant", () => {
  it("F — contenu modifié après validation : Terminé reste Terminé, jamais Reprendre", () => {
    const s = getLearnerModuleDisplayState({
      loaded: true, serverCompleted: true, hasProgress: true,
      quizStats: { completedQuizzes: 3, totalQuizzes: 12 },
    });
    expect(s).toEqual({ status: "termine", action: "revoir", isDone: true, locked: false });
  });

  it("G/H — commencé = Reprendre, jamais commencé = Commencer", () => {
    expect(getLearnerModuleDisplayState({ loaded: true, serverCompleted: false, hasProgress: true }).action).toBe("reprendre");
    expect(getLearnerModuleDisplayState({ loaded: true, serverCompleted: false, hasProgress: false }).action).toBe("commencer");
  });

  it("K/L — chargement non terminé : aucun faux statut pédagogique", () => {
    const s = getLearnerModuleDisplayState({ loaded: false, serverCompleted: false, hasProgress: false });
    expect(s.status).toBe("chargement");
    expect(s.action).toBeNull();
  });

  it("I — un Terminé verrouillé par un ancien état client reste accessible en Revoir", () => {
    const s = getLearnerModuleDisplayState({ loaded: true, serverCompleted: true, hasProgress: false, locked: true });
    expect(s.locked).toBe(false);
    expect(s.action).toBe("revoir");
  });

  it("D/E — ligne parent Terminé + ancienne sous-ligne en cours : Terminé", () => {
    const ids = computeServerCompletedModuleIds(
      [{ module_id: 8, status: "completed" }, { module_id: 801, status: "in_progress" }],
      { 8: [801] },
      (id) => (id === 801 ? 8 : id),
    );
    expect(ids.has(8)).toBe(true);
  });

  it("Cohérence tableau de bord / déblocage / page : même verdict pour chaque module", () => {
    const completed = new Set(SERVER_DONE);
    const quiz = { 2: { completedQuizzes: 1, totalQuizzes: 40 } } as Record<number, any>;
    const unlock = computeUnlockState({
      modules: MODULES, completedModuleIds: completed,
      moduleQuizStatsById: quiz, examBlancStatsById: {}, isElearning: true,
    });
    for (const m of MODULES) {
      const d = getLearnerModuleDisplayState({
        loaded: true, serverCompleted: completed.has(m.id),
        quizStats: quiz[m.id], hasProgress: true,
      });
      expect(unlock.effectivelyCompletedIds.has(m.id)).toBe(d.isDone);
      if (d.isDone) expect(d.action).not.toBe("reprendre");
    }
    // Seul le module non terminé (60, affiché 7) reste à faire, et il est accessible.
    const remaining = MODULES.filter((m) => !unlock.effectivelyCompletedIds.has(m.id)).map((m) => m.id);
    expect(remaining).toEqual([60]);
    expect(unlock.unlockedModuleIds.has(60)).toBe(true);
  });
});
