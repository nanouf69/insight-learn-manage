/**
 * @vitest-environment node
 *
 * Vue apprenant (aperçu admin/formateur) = LECTURE SEULE ABSOLUE.
 *
 * Ces tests vérifient la RÈGLE CENTRALE (pas seulement l'UI) : toute écriture
 * liée à l'élève est refusée pendant la consultation, et fonctionne
 * normalement pour un vrai apprenant connecté sur son propre compte.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  setLearnerPreviewReadOnly,
  isLearnerPreviewReadOnly,
  blockLearnerWrite,
  getBlockedLearnerWrites,
  resetBlockedLearnerWrites,
} from "@/lib/learnerPreviewGuard";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Verrou central Vue apprenant", () => {
  beforeEach(() => {
    setLearnerPreviewReadOnly(false);
    resetBlockedLearnerWrites();
  });

  it("laisse passer les écritures d'un vrai apprenant", () => {
    expect(isLearnerPreviewReadOnly()).toBe(false);
    expect(blockLearnerWrite("save_module_completion")).toBe(false);
    expect(blockLearnerWrite("submit_quiz_attempt")).toBe(false);
    expect(getBlockedLearnerWrites()).toHaveLength(0);
  });

  it("refuse toute écriture en consultation admin", () => {
    setLearnerPreviewReadOnly(true);
    for (const op of [
      "start_or_get_exam_timer",
      "save_module_pages_progress",
      "save_module_completion",
      "submit_quiz_attempt",
      "apprenant_quiz_results(examen blanc)",
      "bilan_examen_blanc(apprenant_documents_completes)",
      "apprenant_question_temps",
      "apprenant_module_activites",
      "apprenants.date_examen_theorique",
    ]) {
      expect(blockLearnerWrite(op)).toBe(true);
    }
    expect(getBlockedLearnerWrites()).toHaveLength(9);
  });

  it("se désarme à la sortie de l'aperçu (l'élève réel n'est jamais bloqué)", () => {
    setLearnerPreviewReadOnly(true);
    expect(blockLearnerWrite("x")).toBe(true);
    setLearnerPreviewReadOnly(false);
    expect(blockLearnerWrite("x")).toBe(false);
  });
});

describe("Points d'écriture réellement protégés", () => {
  const cases: Array<[string, string]> = [
    ["src/lib/moduleCompletion.ts", "save_module_completion"],
    ["src/lib/quizAttempts.ts", "submit_quiz_attempt"],
    ["src/lib/quizResultPersistence.ts", "enqueue_quiz_result"],
    ["src/hooks/useQuestionTimeTracking.ts", "apprenant_question_temps"],
    ["src/hooks/usePresenceCheck.ts", "apprenant_module_activites"],
    ["src/components/cours-en-ligne/ExamenBlancsPassage.tsx", "start_or_get_exam_timer"],
    ["src/components/cours-en-ligne/ModuleDetailView.tsx", "save_module_pages_progress"],
    ["src/components/cours-en-ligne/ExamensBlancsPage.tsx", "apprenant_quiz_results"],
    ["src/components/cours-en-ligne/ExamenBlancsResultats.tsx", "bilan_examen_blanc"],
    ["src/components/cours-en-ligne/StudentHoursTracker.tsx", "date_examen_theorique"],
  ];

  it.each(cases)("%s appelle blockLearnerWrite pour %s", (file, op) => {
    const src = read(file);
    expect(src).toContain("blockLearnerWrite");
    expect(src).toContain(op);
  });

  it("CoursPublic arme le verrou dès le rendu en mode aperçu", () => {
    const src = read("src/pages/CoursPublic.tsx");
    expect(src).toContain("setLearnerPreviewReadOnly(!!embedded)");
  });
});
