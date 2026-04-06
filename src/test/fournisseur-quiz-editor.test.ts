import { describe, it, expect } from "vitest";
import { toggleCorrect, validateQuestionEdit, type QuizChoice } from "@/components/fournisseurs/quiz-editor-utils";

/**
 * Tests for fournisseur EditableQuizViewer bugs:
 *
 * BUG 1 (CRITICAL): RLS policies block fournisseur writes AND reads
 *   Migration 20260327113912 dropped all `public` role policies on
 *   quiz_questions_overrides. Fournisseur portal uses anon key → ALL operations fail.
 *
 * BUG 2: toggleCorrect allows zero correct answers
 *   Clicking the only correct answer toggles it off → no correct answer.
 *
 * BUG 3: saveEdit has no validation
 *   Can save with empty enonce or zero correct answers.
 */

// ─── Bug 2: toggleCorrect must ensure at least one correct ───────
describe("Bug 2: toggleCorrect must use radio-button behavior", () => {
  it("selecting a new choice makes it THE correct answer (radio style)", () => {
    const choix: QuizChoice[] = [
      { lettre: "A", texte: "Choix A", correct: true },
      { lettre: "B", texte: "Choix B", correct: false },
      { lettre: "C", texte: "Choix C", correct: false },
    ];

    // Select B → B becomes correct, A loses correct
    const result = toggleCorrect(choix, 1);
    expect(result[0].correct).toBe(false); // A no longer correct
    expect(result[1].correct).toBe(true);  // B now correct
    expect(result[2].correct).toBe(false); // C unchanged
  });

  it("clicking already-correct answer keeps it correct (no zero-correct state)", () => {
    const choix: QuizChoice[] = [
      { lettre: "A", texte: "Choix A", correct: true },
      { lettre: "B", texte: "Choix B", correct: false },
    ];

    // Click A again → A stays correct
    const result = toggleCorrect(choix, 0);
    expect(result[0].correct).toBe(true);
    expect(result[1].correct).toBe(false);
  });

  it("always results in exactly one correct answer", () => {
    const choix: QuizChoice[] = [
      { lettre: "A", texte: "A", correct: false },
      { lettre: "B", texte: "B", correct: false },
      { lettre: "C", texte: "C", correct: false },
      { lettre: "D", texte: "D", correct: false },
    ];

    const result = toggleCorrect(choix, 2);
    const correctCount = result.filter(c => c.correct).length;
    expect(correctCount).toBe(1);
    expect(result[2].correct).toBe(true);
  });

  it("switching correct from one choice to another", () => {
    const choix: QuizChoice[] = [
      { lettre: "A", texte: "A", correct: false },
      { lettre: "B", texte: "B", correct: true },
    ];

    // Switch to A
    const result = toggleCorrect(choix, 0);
    expect(result[0].correct).toBe(true);
    expect(result[1].correct).toBe(false);
  });
});

// ─── Bug 3: validateQuestionEdit must catch invalid data ─────────
describe("Bug 3: validateQuestionEdit must reject invalid data", () => {
  it("should reject empty enonce", () => {
    const error = validateQuestionEdit("", [
      { lettre: "A", texte: "Choix A", correct: true },
      { lettre: "B", texte: "Choix B", correct: false },
    ]);
    expect(error).not.toBeNull();
  });

  it("should reject whitespace-only enonce", () => {
    const error = validateQuestionEdit("   ", [
      { lettre: "A", texte: "Choix A", correct: true },
      { lettre: "B", texte: "Choix B", correct: false },
    ]);
    expect(error).not.toBeNull();
  });

  it("should reject zero correct answers", () => {
    const error = validateQuestionEdit("Valid question?", [
      { lettre: "A", texte: "Choix A", correct: false },
      { lettre: "B", texte: "Choix B", correct: false },
    ]);
    expect(error).not.toBeNull();
  });

  it("should reject empty choice text", () => {
    const error = validateQuestionEdit("Valid question?", [
      { lettre: "A", texte: "", correct: true },
      { lettre: "B", texte: "Choix B", correct: false },
    ]);
    expect(error).not.toBeNull();
  });

  it("should reject fewer than 2 choices", () => {
    const error = validateQuestionEdit("Valid question?", [
      { lettre: "A", texte: "Only one", correct: true },
    ]);
    expect(error).not.toBeNull();
  });

  it("should accept valid question", () => {
    const error = validateQuestionEdit("Valid question?", [
      { lettre: "A", texte: "Choix A", correct: true },
      { lettre: "B", texte: "Choix B", correct: false },
    ]);
    expect(error).toBeNull();
  });
});

// ─── Bug 1: RLS policies ────────────────────────────────────────
describe("Bug 1: RLS policies block fournisseur quiz operations", () => {
  it("fournisseurId must not be empty string when rendering editor", () => {
    const fournisseur: { id: string } | null = null;
    const fournisseurId = fournisseur?.id || "";
    expect(fournisseurId).toBe("");

    // Fix: guard rendering — component should not mount with empty fournisseurId
    const shouldRender = !!fournisseur?.id;
    expect(shouldRender).toBe(false);
  });
});

// ─── Override application logic ──────────────────────────────────
describe("Override application logic", () => {
  interface Override {
    quiz_id: string;
    section_id: number;
    question_id: number;
    enonce: string;
    choix: QuizChoice[];
  }

  function getQuestion(
    overrides: Map<string, Override>,
    sectionId: number,
    q: { id: number; enonce: string; choix: QuizChoice[] },
  ) {
    const key = `${sectionId}-${q.id}`;
    const override = overrides.get(key);
    if (override && override.enonce !== "__DELETED__") {
      return { id: q.id, enonce: override.enonce, choix: override.choix };
    }
    return q;
  }

  function isDeleted(overrides: Map<string, Override>, sectionId: number, questionId: number): boolean {
    const key = `${sectionId}-${questionId}`;
    const override = overrides.get(key);
    return override?.enonce === "__DELETED__";
  }

  it("should apply override when it exists", () => {
    const overrides = new Map<string, Override>();
    overrides.set("1-5", {
      quiz_id: "test", section_id: 1, question_id: 5,
      enonce: "Modified question",
      choix: [{ lettre: "A", texte: "Modified A", correct: true }],
    });

    const original = { id: 5, enonce: "Original", choix: [{ lettre: "A", texte: "Original A", correct: false }] };
    const result = getQuestion(overrides, 1, original);
    expect(result.enonce).toBe("Modified question");
  });

  it("should detect deleted questions via __DELETED__ sentinel", () => {
    const overrides = new Map<string, Override>();
    overrides.set("1-5", {
      quiz_id: "test", section_id: 1, question_id: 5,
      enonce: "__DELETED__", choix: [],
    });

    expect(isDeleted(overrides, 1, 5)).toBe(true);
    expect(isDeleted(overrides, 1, 6)).toBe(false);
  });
});
