/**
 * TDD RED phase — tests for admin edit propagation bugs
 *
 * Bug A: repairCorrectFlags overwrites admin changes when saved data has
 *        fewer correct QCM questions (threshold too aggressive at 50%)
 *
 * Bug B: texteSupport merge always uses source via `||`, discarding admin edits
 *
 * Bug C: refreshLiveExamens in-flight guard silently drops realtime reloads
 */
import { describe, it, expect } from "vitest";
import type { Matiere, Question } from "../components/cours-en-ligne/examens-blancs-data";
import {
  shouldRepairCorrectFlags,
  mergeTexteSupport,
} from "../components/cours-en-ligne/examens-blancs-utils";

// ────────────────────────────────────────────────────────────
// Helper to build QCM questions with correct flags
// ────────────────────────────────────────────────────────────
function makeQCM(id: number, correctLettre: string | null): Question {
  return {
    id,
    type: "QCM",
    enonce: `Question ${id}`,
    choix: [
      { lettre: "A", texte: "Choix A", correct: correctLettre === "A" ? true : undefined },
      { lettre: "B", texte: "Choix B", correct: correctLettre === "B" ? true : undefined },
      { lettre: "C", texte: "Choix C", correct: correctLettre === "C" ? true : undefined },
    ],
  } as Question;
}

// ────────────────────────────────────────────────────────────
// Bug A: repairCorrectFlags should NOT overwrite valid admin edits
// ────────────────────────────────────────────────────────────

describe("Bug A — shouldRepairCorrectFlags", () => {
  it("should NOT repair when admin changed correct answer (same count)", () => {
    // Admin changed Q1 correct from A to B — same number of correct questions
    const savedQuestions = [makeQCM(1, "B"), makeQCM(2, "A")]; // 2 with correct
    const sourceQuestions = [makeQCM(1, "A"), makeQCM(2, "A")]; // 2 with correct
    expect(shouldRepairCorrectFlags(savedQuestions, sourceQuestions)).toBe(false);
  });

  it("should NOT repair when admin removed correct from ONE question out of 3", () => {
    // Admin is editing Q1 — temporarily has no correct flag
    // savedCorrectCount=2 vs srcCorrectCount=3 → 2 < 3*0.5=1.5 → false, OK
    const savedQuestions = [makeQCM(1, null), makeQCM(2, "A"), makeQCM(3, "B")];
    const sourceQuestions = [makeQCM(1, "A"), makeQCM(2, "A"), makeQCM(3, "B")];
    expect(shouldRepairCorrectFlags(savedQuestions, sourceQuestions)).toBe(false);
  });

  it("should NOT repair when all correct flags are present but changed", () => {
    // Admin swapped all correct answers — all 3 still have correct flags
    const savedQuestions = [makeQCM(1, "B"), makeQCM(2, "C"), makeQCM(3, "A")];
    const sourceQuestions = [makeQCM(1, "A"), makeQCM(2, "A"), makeQCM(3, "B")];
    expect(shouldRepairCorrectFlags(savedQuestions, sourceQuestions)).toBe(false);
  });

  it("should repair when ALL correct flags are lost (serialization bug)", () => {
    // All correct flags lost — this is the real corruption case
    const savedQuestions = [makeQCM(1, null), makeQCM(2, null), makeQCM(3, null)];
    const sourceQuestions = [makeQCM(1, "A"), makeQCM(2, "A"), makeQCM(3, "B")];
    expect(shouldRepairCorrectFlags(savedQuestions, sourceQuestions)).toBe(true);
  });

  it("should repair when correct flags are completely absent", () => {
    const savedQuestions: Question[] = [
      { id: 1, type: "QCM", enonce: "Q1", choix: [{ lettre: "A", texte: "A" }, { lettre: "B", texte: "B" }] } as Question,
    ];
    const sourceQuestions = [makeQCM(1, "A")];
    expect(shouldRepairCorrectFlags(savedQuestions, sourceQuestions)).toBe(true);
  });

  it("should NOT repair when source has no correct flags either", () => {
    const savedQuestions = [makeQCM(1, null)];
    const sourceQuestions = [makeQCM(1, null)];
    expect(shouldRepairCorrectFlags(savedQuestions, sourceQuestions)).toBe(false);
  });

  it("should NOT repair when there are only QRC questions", () => {
    const savedQuestions: Question[] = [
      { id: 1, type: "QRC", enonce: "Q1", reponseQRC: "answer" } as Question,
    ];
    const sourceQuestions: Question[] = [
      { id: 1, type: "QRC", enonce: "Q1", reponseQRC: "answer" } as Question,
    ];
    expect(shouldRepairCorrectFlags(savedQuestions, sourceQuestions)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// Bug B: texteSupport merge should prefer saved (admin edit)
// ────────────────────────────────────────────────────────────

describe("Bug B — mergeTexteSupport", () => {
  it("should use saved texteSupport when admin edited it", () => {
    const result = mergeTexteSupport("Original source text", "Admin edited text");
    expect(result).toBe("Admin edited text");
  });

  it("should fall back to source when saved is empty", () => {
    const result = mergeTexteSupport("Source text", "");
    expect(result).toBe("Source text");
  });

  it("should fall back to source when saved is undefined", () => {
    const result = mergeTexteSupport("Source text", undefined);
    expect(result).toBe("Source text");
  });

  it("should return empty when both are empty", () => {
    const result = mergeTexteSupport("", "");
    expect(result).toBe("");
  });

  it("should use saved when source is empty but saved has value", () => {
    const result = mergeTexteSupport("", "Admin text");
    expect(result).toBe("Admin text");
  });

  it("should use saved even when source also has a value (admin override)", () => {
    // This is the critical test — the OLD code did `source || saved` which always used source
    const result = mergeTexteSupport("Source original", "Admin changed this");
    expect(result).toBe("Admin changed this");
  });
});
