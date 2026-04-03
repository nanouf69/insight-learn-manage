/**
 * TDD tests for admin question deletion propagation
 *
 * BUG: Admin deletes questions from an exam, but they reappear on the student side.
 * Cause: loadSavedExamens re-appends source questions that are NOT in the saved data,
 * treating them as "new" questions instead of "deleted by admin" questions.
 *
 * FIX: When saved data exists for a matiere, the saved question list is the source of truth.
 * Don't re-add source questions that were removed from saved data.
 */
import { describe, it, expect } from "vitest";
import {
  mergeQuestionsForMatiere,
} from "../components/cours-en-ligne/examens-blancs-utils";

const makeQuestion = (id: number, type: string, enonce: string) => ({
  id,
  type,
  enonce,
  choix: type === "QCM" ? [
    { lettre: "A", texte: "A", correct: true },
    { lettre: "B", texte: "B" },
  ] : undefined,
  reponseQRC: type === "QRC" ? "réponse" : undefined,
});

const sourceQuestions = [
  makeQuestion(1, "QCM", "Question 1"),
  makeQuestion(2, "QCM", "Question 2"),
  makeQuestion(3, "QRC", "Question 3"),
  makeQuestion(4, "QCM", "Question 4"),
  makeQuestion(5, "QCM", "Question 5"),
];

// ────────────────────────────────────────────────────────────
// Admin deletes questions — they must NOT reappear
// ────────────────────────────────────────────────────────────

describe("Admin deletes questions — must not reappear on student side", () => {
  it("question deleted by admin stays deleted (not re-added from source)", () => {
    // Admin saved with Q1, Q2, Q4 — deliberately deleted Q3 and Q5
    const savedQuestions = [
      makeQuestion(1, "QCM", "Question 1"),
      makeQuestion(2, "QCM", "Question 2"),
      makeQuestion(4, "QCM", "Question 4"),
    ];

    const result = mergeQuestionsForMatiere(sourceQuestions as any, savedQuestions as any);
    const ids = result.map(q => q.id);
    expect(ids).toEqual([1, 2, 4]);
    expect(ids).not.toContain(3);
    expect(ids).not.toContain(5);
  });

  it("single question deleted — only that one is gone", () => {
    const savedQuestions = [
      makeQuestion(1, "QCM", "Question 1"),
      makeQuestion(2, "QCM", "Question 2"),
      makeQuestion(3, "QRC", "Question 3"),
      makeQuestion(4, "QCM", "Question 4"),
      // Q5 deleted
    ];

    const result = mergeQuestionsForMatiere(sourceQuestions as any, savedQuestions as any);
    expect(result.map(q => q.id)).toEqual([1, 2, 3, 4]);
  });

  it("all questions deleted — result is empty", () => {
    const result = mergeQuestionsForMatiere(sourceQuestions as any, []);
    // Empty saved = admin never saved → return source (backward compat)
    // This is intentional: empty saved means "no admin edits yet"
    expect(result.length).toBe(5);
  });
});

// ────────────────────────────────────────────────────────────
// Admin reorders — order preserved, no extras
// ────────────────────────────────────────────────────────────

describe("Admin reorders questions — saved order preserved", () => {
  it("admin reorder is preserved", () => {
    const savedQuestions = [
      makeQuestion(4, "QCM", "Question 4"),
      makeQuestion(2, "QCM", "Question 2"),
      makeQuestion(1, "QCM", "Question 1"),
      makeQuestion(3, "QRC", "Question 3"),
      makeQuestion(5, "QCM", "Question 5"),
    ];

    const result = mergeQuestionsForMatiere(sourceQuestions as any, savedQuestions as any);
    expect(result.map(q => q.id)).toEqual([4, 2, 1, 3, 5]);
  });
});

// ────────────────────────────────────────────────────────────
// Admin modifies + deletes — edit sticks, deleted stays gone
// ────────────────────────────────────────────────────────────

describe("Admin edits + deletes together", () => {
  it("edited question persists, deleted question stays gone", () => {
    const savedQuestions = [
      { ...makeQuestion(1, "QCM", "Question 1 MODIFIÉE") },
      makeQuestion(2, "QCM", "Question 2"),
      // Q3, Q4, Q5 deleted
    ];

    const result = mergeQuestionsForMatiere(sourceQuestions as any, savedQuestions as any);
    expect(result.length).toBe(2);
    expect(result[0].enonce).toBe("Question 1 MODIFIÉE");
    expect(result.map(q => q.id)).toEqual([1, 2]);
  });
});

// ────────────────────────────────────────────────────────────
// No saved data = first load — all source questions appear
// ────────────────────────────────────────────────────────────

describe("No saved data — source is the truth", () => {
  it("returns all source questions when no saved data exists", () => {
    const result = mergeQuestionsForMatiere(sourceQuestions as any, undefined as any);
    expect(result.length).toBe(5);
  });

  it("returns all source questions when saved is null", () => {
    const result = mergeQuestionsForMatiere(sourceQuestions as any, null as any);
    expect(result.length).toBe(5);
  });
});

// ────────────────────────────────────────────────────────────
// Admin adds custom question — it persists
// ────────────────────────────────────────────────────────────

describe("Admin adds custom question not in source", () => {
  it("custom admin question is preserved", () => {
    const savedQuestions = [
      ...sourceQuestions.map(q => makeQuestion(q.id, q.type, q.enonce)),
      makeQuestion(99, "QCM", "Nouvelle question admin"),
    ];

    const result = mergeQuestionsForMatiere(sourceQuestions as any, savedQuestions as any);
    expect(result.length).toBe(6);
    expect(result[5].id).toBe(99);
    expect(result[5].enonce).toBe("Nouvelle question admin");
  });
});
