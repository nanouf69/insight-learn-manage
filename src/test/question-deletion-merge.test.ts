import { describe, it, expect } from "vitest";
import { mergeSourceExercices } from "@/components/cours-en-ligne/examens-blancs-utils";

/**
 * Tests for deleted questions reappearing after merge.
 *
 * BUG: When admin deletes a question from an exercice:
 * 1. Question is removed from exercice.questions array
 * 2. Module data (with fewer questions) is saved to DB
 * 3. On student load, mergeSourceExercices iterates sourceExo.questions
 * 4. Deleted question is still in source → if (!loadedQ) return sourceQ → question REAPPEARS
 *
 * FIX: Track deletedQuestionIds in exercice data. In merge, skip source
 * questions whose IDs are in the deleted list.
 */

function makeExercice(id: number, questions: any[], deletedQuestionIds?: number[]) {
  return {
    id,
    titre: `Exercice ${id}`,
    sousTitre: "",
    actif: true,
    questions,
    ...(deletedQuestionIds ? { deletedQuestionIds } : {}),
  };
}

function makeQuestion(id: number, enonce: string, correct: string = "A") {
  return {
    id,
    enonce,
    choix: [
      { lettre: "A", texte: "Choix A", correct: correct === "A" },
      { lettre: "B", texte: "Choix B", correct: correct === "B" },
    ],
  };
}

describe("Bug: Deleted questions reappear after merge (modules)", () => {
  it("deleted question reappears from source when no tracking (demonstrates bug)", () => {
    // Admin deleted Q2 from exercice
    const saved = [makeExercice(1, [
      makeQuestion(1, "Q1 modifiée", "B"),
      // Q2 was deleted by admin — not in saved
      makeQuestion(3, "Q3 modifiée", "A"),
    ])];

    const source = [makeExercice(1, [
      makeQuestion(1, "Q1 originale", "A"),
      makeQuestion(2, "Q2 originale", "A"), // still in source
      makeQuestion(3, "Q3 originale", "A"),
    ])];

    const merged = mergeSourceExercices(saved, source);

    // Without fix: Q2 comes back from source (3 questions)
    // With fix: Q2 stays deleted (2 questions)
    // For now this demonstrates the current behavior
    expect(merged[0].questions!.length).toBe(3); // BUG: Q2 came back
    expect(merged[0].questions![1].enonce).toBe("Q2 originale"); // BUG: source Q2 restored
  });

  it("deletedQuestionIds should prevent deleted questions from reappearing", () => {
    // Admin deleted Q2, and deletedQuestionIds tracks the deletion
    const saved = [makeExercice(1, [
      makeQuestion(1, "Q1 modifiée", "B"),
      makeQuestion(3, "Q3 modifiée", "A"),
    ], [2])]; // deletedQuestionIds: [2]

    const source = [makeExercice(1, [
      makeQuestion(1, "Q1 originale", "A"),
      makeQuestion(2, "Q2 originale", "A"),
      makeQuestion(3, "Q3 originale", "A"),
    ])];

    const merged = mergeSourceExercices(saved, source);

    // With fix: Q2 stays deleted
    expect(merged[0].questions!.length).toBe(2);
    expect(merged[0].questions![0].enonce).toBe("Q1 modifiée");
    expect(merged[0].questions![1].enonce).toBe("Q3 modifiée");
  });

  it("deletedQuestionIds should survive JSON roundtrip (DB save/load)", () => {
    const exercice = makeExercice(1, [makeQuestion(1, "Q1", "A")], [2, 5, 8]);
    const roundtripped = JSON.parse(JSON.stringify(exercice));

    expect(roundtripped.deletedQuestionIds).toEqual([2, 5, 8]);
  });

  it("new source questions NOT in deletedQuestionIds should still appear", () => {
    // Admin deleted Q2 but source added Q4 (new)
    const saved = [makeExercice(1, [
      makeQuestion(1, "Q1", "A"),
      makeQuestion(3, "Q3", "A"),
    ], [2])]; // only Q2 was deleted

    const source = [makeExercice(1, [
      makeQuestion(1, "Q1 source", "A"),
      makeQuestion(2, "Q2 source", "A"),
      makeQuestion(3, "Q3 source", "A"),
      makeQuestion(4, "Q4 NEW from source", "A"), // genuinely new
    ])];

    const merged = mergeSourceExercices(saved, source);

    // Q2 deleted, Q4 new → 3 questions
    expect(merged[0].questions!.length).toBe(3);
    expect(merged[0].questions!.map(q => q.id)).toEqual([1, 3, 4]);
    expect(merged[0].questions![2].enonce).toBe("Q4 NEW from source");
  });

  it("deleting multiple questions should all stay deleted", () => {
    const saved = [makeExercice(1, [
      makeQuestion(1, "Q1", "A"),
    ], [2, 3, 4])]; // deleted Q2, Q3, Q4

    const source = [makeExercice(1, [
      makeQuestion(1, "Q1 source", "A"),
      makeQuestion(2, "Q2 source", "A"),
      makeQuestion(3, "Q3 source", "A"),
      makeQuestion(4, "Q4 source", "A"),
    ])];

    const merged = mergeSourceExercices(saved, source);

    expect(merged[0].questions!.length).toBe(1);
    expect(merged[0].questions![0].id).toBe(1);
  });
});
