// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  buildExerciceId,
  buildInlineQuizId,
  isAttemptSubmitted,
} from "@/lib/quizAttempts";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf-8");

describe("Chaîne de validation des quiz", () => {
  it("règle unique : seul status='submitted' vaut quiz terminé", () => {
    expect(isAttemptSubmitted({ status: "submitted" } as any)).toBe(true);
    expect(isAttemptSubmitted({ status: "in_progress" } as any)).toBe(false);
    // des réponses enregistrées ne valident jamais un quiz
    expect(isAttemptSubmitted({ status: "in_progress", reponses: { "1-1": "A" } } as any)).toBe(false);
    expect(isAttemptSubmitted(null)).toBe(false);
    expect(isAttemptSubmitted(undefined)).toBe(false);
  });

  it("identifiants d'exercices canoniques", () => {
    expect(buildExerciceId(81, 3)).toBe("module_81_exo_3");
    expect(buildInlineQuizId(81, 3)).toBe("module_81_inline_3");
  });

  it("le bouton Valider persiste côté serveur (pas seulement l'état React)", () => {
    const src = read("src/components/cours-en-ligne/ModuleDetailView.tsx");
    // Exercice
    expect(src).toContain("submitQuizAttempt({");
    expect(src).toContain("exerciceId: buildExerciceId(module.id, exo.id)");
    // Quiz intégré au cours
    expect(src).toContain("exerciceId: buildInlineQuizId(module.id, cours.id)");
    // Échec serveur => pas de validation silencieuse
    expect(src).toContain("Validation non enregistrée sur le serveur");
  });

  it("la restauration se base sur le statut serveur, pas sur la présence de réponses", () => {
    const src = read("src/components/cours-en-ligne/ModuleDetailView.tsx");
    expect(src).toContain("const applySubmittedAttempts");
    expect(src).toContain("if (!isAttemptSubmitted(row as any)) return;");
    // plus de filtre "!row.completed" pour restaurer les réponses
    expect(src).not.toContain("if (!row.completed && row.reponses");
  });

  it("markCompleted passe par la RPC de validation définitive", () => {
    const src = read("src/hooks/useAutoSaveReponses.ts");
    expect(src).toContain("submitQuizAttempt({");
    expect(src).toContain("isSubmitted");
  });

  it("l'autosave n'envoie jamais un statut de validation", () => {
    const src = read("src/components/cours-en-ligne/ModuleDetailView.tsx");
    // les upserts d'autosave restent completed:false (le trigger DB empêche la dévalidation)
    expect(src).toContain("completed: false,");
  });
});
