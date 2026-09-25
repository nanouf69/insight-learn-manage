// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getLearnerModuleDisplayState } from "@/lib/moduleUnlockLogic";
import * as answers from "@/lib/answerPersistence";

const dashboard = readFileSync(resolve(__dirname, "../pages/CoursPublic.tsx"), "utf8");

describe("Tableau de bord = lecteur de l'état serveur", () => {
  it("1/6 — aucune écriture de statut ou progression depuis le tableau de bord", () => {
    expect(dashboard).not.toMatch(/repairInconsistentCompletions/);
    expect(dashboard).not.toMatch(/saveModuleCompletion/);
    expect(dashboard).not.toMatch(/from\(["']apprenant_module_completion["']\)[\s\S]{0,200}\.(upsert|update|insert)\(/);
    expect(dashboard).not.toMatch(/save_module_completion/);
  });
  it("2 — module incomplet reste incomplet", () => {
    expect(getLearnerModuleDisplayState({ loaded: true, serverCompleted: false, hasProgress: true }).isDone).toBe(false);
  });
  it("3/4 — Terminé serveur reste Terminé malgré un ancien compteur local", () => {
    const s = getLearnerModuleDisplayState({ loaded: true, serverCompleted: true, hasProgress: false, quizStats: { completedQuizzes: 0, totalQuizzes: 9 } });
    expect(s.status).toBe("termine");
  });
  it("5 — la synchronisation des réponses en attente reste disponible", () => {
    expect(typeof answers.flushOwnAnswerSavesBeforeLogout).toBe("function");
    expect(dashboard).toMatch(/flushOwnAnswerSavesBeforeLogout/);
  });
});
