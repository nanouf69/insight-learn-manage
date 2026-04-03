/**
 * TDD tests for question reorder in exam editor.
 * Feature: admin can move a question to any position (e.g. Q4 → position 1).
 */
import { describe, it, expect } from "vitest";
import { moveQuestionToPosition } from "../components/cours-en-ligne/examens-blancs-utils";

const makeQ = (id: number) => ({ id, type: "QCM" as const, enonce: `Question ${id}`, choix: [] });

describe("moveQuestionToPosition — reorder questions freely", () => {
  it("moves last question to first position", () => {
    const questions = [makeQ(1), makeQ(2), makeQ(3), makeQ(4)];
    const result = moveQuestionToPosition(questions, 4, 0);
    expect(result.map(q => q.id)).toEqual([4, 1, 2, 3]);
  });

  it("moves first question to last position", () => {
    const questions = [makeQ(1), makeQ(2), makeQ(3), makeQ(4)];
    const result = moveQuestionToPosition(questions, 1, 3);
    expect(result.map(q => q.id)).toEqual([2, 3, 4, 1]);
  });

  it("moves middle question forward", () => {
    const questions = [makeQ(1), makeQ(2), makeQ(3), makeQ(4), makeQ(5)];
    const result = moveQuestionToPosition(questions, 2, 4);
    expect(result.map(q => q.id)).toEqual([1, 3, 4, 5, 2]);
  });

  it("moves middle question backward", () => {
    const questions = [makeQ(1), makeQ(2), makeQ(3), makeQ(4), makeQ(5)];
    const result = moveQuestionToPosition(questions, 4, 1);
    expect(result.map(q => q.id)).toEqual([1, 4, 2, 3, 5]);
  });

  it("no-op when moving to same position", () => {
    const questions = [makeQ(1), makeQ(2), makeQ(3)];
    const result = moveQuestionToPosition(questions, 2, 1);
    expect(result.map(q => q.id)).toEqual([1, 2, 3]);
  });

  it("returns original array when question ID not found", () => {
    const questions = [makeQ(1), makeQ(2), makeQ(3)];
    const result = moveQuestionToPosition(questions, 99, 0);
    expect(result.map(q => q.id)).toEqual([1, 2, 3]);
  });

  it("clamps target position to valid range (negative)", () => {
    const questions = [makeQ(1), makeQ(2), makeQ(3)];
    const result = moveQuestionToPosition(questions, 3, -5);
    expect(result.map(q => q.id)).toEqual([3, 1, 2]);
  });

  it("clamps target position to valid range (too large)", () => {
    const questions = [makeQ(1), makeQ(2), makeQ(3)];
    const result = moveQuestionToPosition(questions, 1, 100);
    expect(result.map(q => q.id)).toEqual([2, 3, 1]);
  });

  it("works with single question (no-op)", () => {
    const questions = [makeQ(1)];
    const result = moveQuestionToPosition(questions, 1, 0);
    expect(result.map(q => q.id)).toEqual([1]);
  });

  it("preserves all question data after move", () => {
    const questions = [
      { id: 1, type: "QCM" as const, enonce: "Q1", choix: [{ lettre: "A", texte: "A", correct: true }], image: "img.png" },
      { id: 2, type: "QRC" as const, enonce: "Q2", choix: [], reponseQRC: "réponse" },
    ];
    const result = moveQuestionToPosition(questions, 2, 0);
    expect(result[0].enonce).toBe("Q2");
    expect(result[0].reponseQRC).toBe("réponse");
    expect(result[1].choix![0].correct).toBe(true);
    expect(result[1].image).toBe("img.png");
  });
});
