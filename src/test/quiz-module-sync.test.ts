import { describe, expect, it } from "vitest";
import { buildModuleQuestionMap } from "@/components/fournisseurs/quiz-module-sync";

const question = (id: number, answer: string, editedAt?: string) => ({
  id,
  enonce: `Question ${id}`,
  choix: [
    { lettre: "A", texte: "A", correct: answer === "A" },
    { lettre: "B", texte: "B", correct: answer === "B" },
  ],
  _editedAt: editedAt,
});

const row = (updatedAt: string, questions: ReturnType<typeof question>[]) => ({
  updated_at: updatedAt,
  module_data: { exercices: [{ id: 71, questions }] },
});

describe("buildModuleQuestionMap — dernière version par question", () => {
  it("garde la question admin la plus récente malgré un autre module touché après", () => {
    const result = buildModuleQuestionMap([
      row("2026-09-07T14:08:05Z", [question(1, "B", "2026-09-07T14:08:00Z")]),
      row("2026-09-07T14:09:00Z", [question(1, "A", "2026-09-07T09:00:00Z")]),
    ]);

    expect(result.get(71)?.[0].choix.find((choice) => choice.correct)?.lettre).toBe("B");
  });

  it("fusionne chaque question indépendamment sans perdre les autres réponses", () => {
    const result = buildModuleQuestionMap([
      row("2026-09-07T12:00:00Z", [
        question(1, "B", "2026-09-07T11:00:00Z"),
        question(2, "A", "2026-09-07T08:00:00Z"),
      ]),
      row("2026-09-07T13:00:00Z", [
        question(1, "A", "2026-09-07T09:00:00Z"),
        question(2, "B", "2026-09-07T12:30:00Z"),
      ]),
    ]);

    const questions = result.get(71) ?? [];
    expect(questions.map((item) => item.choix.find((choice) => choice.correct)?.lettre)).toEqual(["B", "B"]);
  });

  it("utilise la structure la plus récente pour ne pas restaurer une question supprimée", () => {
    const result = buildModuleQuestionMap([
      row("2026-09-07T12:00:00Z", [question(1, "A"), question(2, "B")]),
      row("2026-09-07T13:00:00Z", [question(1, "A")]),
    ]);

    expect(result.get(71)?.map((item) => item.id)).toEqual([1]);
  });
});