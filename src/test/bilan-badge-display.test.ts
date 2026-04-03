/**
 * TDD tests for bilan exercise badge display bug
 *
 * Bug: score is correct (78/128) but ALL questions show red badges.
 * Cause: inline check `selected === correct.lettre` compares array to string → always false.
 * The correct helper `isAnswerCorrect` handles arrays properly but isn't used for badge display.
 */
import { describe, it, expect } from "vitest";
import {
  isBilanAnswerCorrect,
  isBilanAnswerCorrectBroken,
} from "../components/cours-en-ligne/examens-blancs-utils";

const choixABC = [
  { lettre: "A", texte: "Choix A", correct: true },
  { lettre: "B", texte: "Choix B", correct: false },
  { lettre: "C", texte: "Choix C", correct: false },
];

const choixMulti = [
  { lettre: "A", texte: "Choix A", correct: true },
  { lettre: "B", texte: "Choix B", correct: false },
  { lettre: "C", texte: "Choix C", correct: true },
];

// ────────────────────────────────────────────────────────────
// Prove the broken check always fails for array answers
// ────────────────────────────────────────────────────────────

describe("Broken legacy check — reproduces the bug", () => {
  it("returns false for correct single-answer stored as array ['A']", () => {
    // This is the actual bug: selectedAnswers stores ["A"] not "A"
    expect(isBilanAnswerCorrectBroken(["A"], choixABC)).toBe(false);
  });

  it("returns false for correct multi-answer ['A','C']", () => {
    expect(isBilanAnswerCorrectBroken(["A", "C"], choixMulti)).toBe(false);
  });

  it("only works for plain string (not how answers are stored)", () => {
    // The only case where the broken check works — but answers are never stored this way
    expect(isBilanAnswerCorrectBroken("A", choixABC)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// Fixed check — handles all answer formats
// ────────────────────────────────────────────────────────────

describe("Fixed isBilanAnswerCorrect — single correct answer", () => {
  it("returns true for correct answer as array ['A']", () => {
    expect(isBilanAnswerCorrect(["A"], choixABC)).toBe(true);
  });

  it("returns true for correct answer as string 'A'", () => {
    expect(isBilanAnswerCorrect("A", choixABC)).toBe(true);
  });

  it("returns false for wrong answer as array ['B']", () => {
    expect(isBilanAnswerCorrect(["B"], choixABC)).toBe(false);
  });

  it("returns false for wrong answer as string 'B'", () => {
    expect(isBilanAnswerCorrect("B", choixABC)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isBilanAnswerCorrect(undefined, choixABC)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(isBilanAnswerCorrect([], choixABC)).toBe(false);
  });
});

describe("Fixed isBilanAnswerCorrect — multiple correct answers", () => {
  it("returns true for correct multi-answer ['A','C']", () => {
    expect(isBilanAnswerCorrect(["A", "C"], choixMulti)).toBe(true);
  });

  it("returns true for correct multi-answer in different order ['C','A']", () => {
    expect(isBilanAnswerCorrect(["C", "A"], choixMulti)).toBe(true);
  });

  it("returns false for partial answer ['A']", () => {
    expect(isBilanAnswerCorrect(["A"], choixMulti)).toBe(false);
  });

  it("returns false for wrong + correct ['A','B']", () => {
    expect(isBilanAnswerCorrect(["A", "B"], choixMulti)).toBe(false);
  });

  it("returns false for all selected ['A','B','C']", () => {
    expect(isBilanAnswerCorrect(["A", "B", "C"], choixMulti)).toBe(false);
  });
});

describe("Fixed isBilanAnswerCorrect — edge cases", () => {
  it("returns false for no correct choices defined", () => {
    const noCorrect = [
      { lettre: "A", texte: "A" },
      { lettre: "B", texte: "B" },
    ];
    expect(isBilanAnswerCorrect(["A"], noCorrect)).toBe(false);
  });

  it("returns false for empty choix array", () => {
    expect(isBilanAnswerCorrect(["A"], [])).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// Simulate real bilan scenario: 128 questions, score matches badge count
// ────────────────────────────────────────────────────────────

describe("Real scenario — score and badge count must match", () => {
  it("badge count should match score computation for mixed results", () => {
    // Simulate 10 questions: 6 correct, 4 wrong
    const questions = [
      { id: 1, choix: [{ lettre: "A", correct: true }, { lettre: "B" }] },
      { id: 2, choix: [{ lettre: "A" }, { lettre: "B", correct: true }] },
      { id: 3, choix: [{ lettre: "A", correct: true }, { lettre: "B" }] },
      { id: 4, choix: [{ lettre: "A", correct: true }, { lettre: "C", correct: true }] },
      { id: 5, choix: [{ lettre: "A" }, { lettre: "B", correct: true }] },
      { id: 6, choix: [{ lettre: "A", correct: true }, { lettre: "B" }] },
      { id: 7, choix: [{ lettre: "A" }, { lettre: "B", correct: true }] },
      { id: 8, choix: [{ lettre: "A", correct: true }, { lettre: "B" }] },
      { id: 9, choix: [{ lettre: "A" }, { lettre: "B", correct: true }] },
      { id: 10, choix: [{ lettre: "A", correct: true }, { lettre: "B" }] },
    ];

    // Answers stored as arrays (like the real app does)
    const answers: Record<string, string[]> = {
      "exo1-1": ["A"],       // correct
      "exo1-2": ["B"],       // correct
      "exo1-3": ["B"],       // wrong
      "exo1-4": ["A", "C"],  // correct (multi)
      "exo1-5": ["A"],       // wrong
      "exo1-6": ["A"],       // correct
      "exo1-7": ["A"],       // wrong
      "exo1-8": ["A"],       // correct
      "exo1-9": ["A"],       // wrong
      "exo1-10": ["A"],      // correct
    };

    // Score computation (like the real code)
    const score = questions.filter(q => {
      const key = `exo1-${q.id}`;
      return isBilanAnswerCorrect(answers[key], q.choix as any);
    }).length;

    // Badge computation (should use same function)
    const greenBadges = questions.filter(q => {
      const key = `exo1-${q.id}`;
      return isBilanAnswerCorrect(answers[key], q.choix as any);
    }).length;

    const wrongCount = questions.length - greenBadges;

    expect(score).toBe(6);
    expect(greenBadges).toBe(6);
    expect(wrongCount).toBe(4);
    // Score and badge count MUST match
    expect(score).toBe(greenBadges);
  });
});
