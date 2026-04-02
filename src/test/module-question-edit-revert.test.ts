/**
 * TDD tests for BUG: admin edits module questions (correct answer, enonce, choix)
 * but changes revert on reload because mergeSourceExercices gives source priority
 * over saved DB data.
 *
 * Root cause: spread order `{...loadedQ, ...sourceQ}` — source overwrites saved.
 * And `choix:` line always picks sourceQ.choix.
 */
import { describe, it, expect } from "vitest";
import { mergeSourceExercices } from "../components/cours-en-ligne/examens-blancs-utils";

function makeChoix(lettre: string, texte: string, correct?: boolean) {
  return { lettre, texte, ...(correct !== undefined ? { correct } : {}) };
}

function makeExercice(id: number, questions: { id: number; enonce: string; choix: any[]; image?: string }[]) {
  return { id, titre: `Exercice ${id}`, actif: true, questions };
}

// ────────────────────────────────────────────────────────────
// Core bug: admin correct answer changes revert on reload
// ────────────────────────────────────────────────────────────

describe("BUG — Module mergeSourceExercices: saved data must take priority over source", () => {
  it("admin changed correct answer A→C: must survive merge", () => {
    const source = [makeExercice(1, [
      { id: 1, enonce: "Q1", choix: [makeChoix("A", "50 km/h", true), makeChoix("B", "70 km/h"), makeChoix("C", "90 km/h")] },
    ])];

    // Admin changed correct from A to C, saved to DB
    const saved = [makeExercice(1, [
      { id: 1, enonce: "Q1", choix: [makeChoix("A", "50 km/h", false), makeChoix("B", "70 km/h", false), makeChoix("C", "90 km/h", true)] },
    ])];

    const merged = mergeSourceExercices(saved, source);

    expect(merged[0].questions![0].choix[0].correct).toBe(false);  // A unchecked
    expect(merged[0].questions![0].choix[2].correct).toBe(true);   // C is now correct
  });

  it("admin changed enonce text: must survive merge", () => {
    const source = [makeExercice(1, [
      { id: 1, enonce: "Old question text", choix: [makeChoix("A", "A", true)] },
    ])];

    const saved = [makeExercice(1, [
      { id: 1, enonce: "New question text edited by admin", choix: [makeChoix("A", "A", true)] },
    ])];

    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].enonce).toBe("New question text edited by admin");
  });

  it("admin changed choice text: must survive merge", () => {
    const source = [makeExercice(1, [
      { id: 1, enonce: "Q1", choix: [makeChoix("A", "Original text", true), makeChoix("B", "Option B")] },
    ])];

    const saved = [makeExercice(1, [
      { id: 1, enonce: "Q1", choix: [makeChoix("A", "Admin changed text", true), makeChoix("B", "Option B")] },
    ])];

    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].choix[0].texte).toBe("Admin changed text");
  });

  it("admin added a new choice: must survive merge", () => {
    const source = [makeExercice(1, [
      { id: 1, enonce: "Q1", choix: [makeChoix("A", "A", true), makeChoix("B", "B")] },
    ])];

    const saved = [makeExercice(1, [
      { id: 1, enonce: "Q1", choix: [makeChoix("A", "A", false), makeChoix("B", "B", false), makeChoix("C", "New choice", true)] },
    ])];

    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].choix).toHaveLength(3);
    expect(merged[0].questions![0].choix[2].texte).toBe("New choice");
    expect(merged[0].questions![0].choix[2].correct).toBe(true);
  });

  it("admin image survives merge", () => {
    const source = [makeExercice(1, [
      { id: 1, enonce: "Q1", choix: [makeChoix("A", "A", true)] },
    ])];

    const saved = [makeExercice(1, [
      { id: 1, enonce: "Q1", choix: [makeChoix("A", "A", true)], image: "https://storage.example/img.png" },
    ])];

    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].image).toBe("https://storage.example/img.png");
  });
});

// ────────────────────────────────────────────────────────────
// Merge with new source questions (admin hasn't edited them)
// ────────────────────────────────────────────────────────────

describe("mergeSourceExercices — new source questions appear alongside saved ones", () => {
  it("source has a question not in saved: it appears in merged", () => {
    const source = [makeExercice(1, [
      { id: 1, enonce: "Q1", choix: [makeChoix("A", "A", true)] },
      { id: 2, enonce: "Q2 new from source", choix: [makeChoix("A", "X", true)] },
    ])];

    const saved = [makeExercice(1, [
      { id: 1, enonce: "Q1 edited", choix: [makeChoix("A", "A", true)] },
    ])];

    const merged = mergeSourceExercices(saved, source);
    // Q1 should have saved version
    expect(merged[0].questions![0].enonce).toBe("Q1 edited");
    // Q2 should come from source
    expect(merged[0].questions!).toHaveLength(2);
    expect(merged[0].questions![1].enonce).toBe("Q2 new from source");
  });

  it("source has new exercice not in saved: it appears in merged", () => {
    const source = [
      makeExercice(1, [{ id: 1, enonce: "Q1", choix: [makeChoix("A", "A", true)] }]),
      makeExercice(2, [{ id: 1, enonce: "New exo Q1", choix: [makeChoix("A", "A", true)] }]),
    ];

    const saved = [
      makeExercice(1, [{ id: 1, enonce: "Q1 edited", choix: [makeChoix("A", "A", true)] }]),
    ];

    const merged = mergeSourceExercices(saved, source);
    expect(merged).toHaveLength(2);
    expect(merged[0].questions![0].enonce).toBe("Q1 edited");
    expect(merged[1].questions![0].enonce).toBe("New exo Q1");
  });
});

// ────────────────────────────────────────────────────────────
// JSON round-trip (simulates DB serialization)
// ────────────────────────────────────────────────────────────

describe("mergeSourceExercices — survives JSON round-trip (DB storage)", () => {
  it("correct answer change survives JSON.stringify/parse + merge", () => {
    const source = [makeExercice(1, [
      { id: 1, enonce: "Q1", choix: [makeChoix("A", "A", true), makeChoix("B", "B")] },
    ])];

    const adminEdit = [makeExercice(1, [
      { id: 1, enonce: "Q1", choix: [makeChoix("A", "A", false), makeChoix("B", "B", true)] },
    ])];

    // Simulate DB round-trip
    const savedFromDB = JSON.parse(JSON.stringify(adminEdit));

    const merged = mergeSourceExercices(savedFromDB, source);
    expect(merged[0].questions![0].choix[0].correct).toBe(false);
    expect(merged[0].questions![0].choix[1].correct).toBe(true);
  });
});
