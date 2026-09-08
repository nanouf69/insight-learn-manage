// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyCanonicalRowsToSections } from "@/components/fournisseurs/canonical-quiz-sections";

const sourceSections = [{
  id: 70,
  titre: "Partie 1",
  questions: [
    { id: 1, enonce: "Ancienne question 1", choix: [{ lettre: "A", texte: "Ancienne A", correct: true }] },
    { id: 2, enonce: "Ancienne question 2", choix: [{ lettre: "A", texte: "Ancienne A", correct: true }] },
  ],
}];

const row = (overrides: Record<string, unknown> = {}) => ({
  question_id: "11111111-1111-4111-8111-111111111111",
  section_id: 70,
  legacy_question_id: 1,
  position: 1,
  enonce: "Question actuelle",
  choix: [
    { lettre: "A", texte: "Réponse actuelle A", correct: false },
    { lettre: "B", texte: "Réponse actuelle B", correct: true },
  ],
  active: true,
  updated_at: "2026-09-08T08:00:00Z",
  ...overrides,
});

describe("persistance des suppressions dans la source canonique", () => {
  it("ne réinjecte pas la dernière question supprimée depuis la liste statique", () => {
    const result = applyCanonicalRowsToSections(sourceSections, [row({ active: false })]);

    expect(result[0].questions).toEqual([]);
  });

  it("conserve uniquement les lignes actives lorsque certaines sont supprimées", () => {
    const result = applyCanonicalRowsToSections(sourceSections, [
      row({ active: false }),
      row({
        question_id: "22222222-2222-4222-8222-222222222222",
        legacy_question_id: 2,
        position: 2,
        enonce: "Question 2 actuelle",
      }),
    ]);

    expect(result[0].questions?.map((question) => question.id)).toEqual([2]);
    expect(result[0].questions?.[0].enonce).toBe("Question 2 actuelle");
  });

  it("reste stable après plusieurs rechargements", () => {
    const deletedRows = [row({ active: false })];
    for (let reload = 0; reload < 5; reload += 1) {
      const result = applyCanonicalRowsToSections(sourceSections, deletedRows);
      expect(result[0].questions).toEqual([]);
    }
  });

  it("utilise seulement la réponse et la bonne réponse actuelles", () => {
    const result = applyCanonicalRowsToSections(sourceSections, [row()]);
    const question = result[0].questions?.[0];

    expect(question?.choix).toEqual([
      { lettre: "A", texte: "Réponse actuelle A", correct: false },
      { lettre: "B", texte: "Réponse actuelle B", correct: true },
    ]);
    expect(question?.choix.some((choice) => choice.texte === "Ancienne A")).toBe(false);
  });

  it("garde le modèle uniquement pour une section jamais initialisée en base", () => {
    const result = applyCanonicalRowsToSections(sourceSections, []);

    expect(result[0].questions).toEqual(sourceSections[0].questions);
  });
});