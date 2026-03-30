/**
 * Tests that import REAL functions from exam-helpers.ts.
 *
 * These tests describe the EXPECTED (fixed) behavior.
 * They MUST FAIL against the current buggy code, then PASS after fixes.
 */
import { describe, it, expect } from "vitest";
import {
  buildExamenMap,
  shouldSkipResultRow,
  buildQuestionDetails,
  buildExerciceKeyAutoSave,
  buildExerciceKeyFlush,
  isExamPhaseProtected,
  getQuestionKey,
} from "../components/cours-en-ligne/exam-helpers";

// ── Fixtures ──────────────────────────────────────────────────────────────

const MATIERE_GESTION: any = {
  id: "gestion",
  nom: "B - Gestion",
  duree: 45,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 36,
  questions: [
    { id: 1, type: "QRC", enonce: "Citez deux régimes...", reponseQRC: "Le régime général." },
    { id: 2, type: "QRC", enonce: "Développez URSSAF.", reponseQRC: "Union de Recouvrement..." },
    { id: 3, type: "QCM", enonce: "Un QCM", choix: [{ lettre: "A", texte: "Oui", correct: true }] },
  ],
};

const SOURCE_EXAMEN: any = {
  id: "EB1",
  titre: "Examen Blanc 1",
  matieres: [MATIERE_GESTION],
};

// ═══════════════════════════════════════════════════════════════════════════
// Bug QRC-1: buildExamenMap should use .find() to locate saved exam by ID
// ═══════════════════════════════════════════════════════════════════════════

describe("Bug QRC-1: buildExamenMap must find saved exams by ID", () => {
  it("should return saved exam data, not raw source data", () => {
    const saved = [
      { ...SOURCE_EXAMEN, matieres: [{ ...MATIERE_GESTION, nom: "Gestion modifiée" }] },
    ];

    const map = buildExamenMap([SOURCE_EXAMEN], saved);

    // EXPECTED: map should contain saved version with modified name
    // WILL FAIL: buggy code does saved["EB1"] on array → undefined → falls back to source
    expect(map["EB1"].matieres[0].nom).toBe("Gestion modifiée");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Bug QRC-2: shouldSkipResultRow must NOT skip rows with reponses but no questions key
// ═══════════════════════════════════════════════════════════════════════════

describe("Bug QRC-2: shouldSkipResultRow must allow rows without questions key", () => {
  it("should NOT skip when details has reponses but no questions key", () => {
    // This is the rebuild path: details = { reponses: {...} }
    const details = { reponses: { 1: "régime général" } };

    // EXPECTED: should not skip (false)
    // WILL FAIL: buggy code does !details?.questions → true (skip)
    expect(shouldSkipResultRow(details)).toBe(false);
  });

  it("should still skip when details is null", () => {
    expect(shouldSkipResultRow(null)).toBe(true);
  });

  it("should NOT skip when details has empty questions array", () => {
    const details = { questions: [], reponses: { 1: "test" } };
    // Empty array is truthy, so this already passes — not a failing case
    expect(shouldSkipResultRow(details)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Bug QRC-3: buildQuestionDetails must fallback to source when matiere.questions is empty
// ═══════════════════════════════════════════════════════════════════════════

describe("Bug QRC-3: buildQuestionDetails must fallback to source", () => {
  it("should return question details even when matiere.questions is []", () => {
    const emptyMatiere: any = { id: "gestion", questions: [] };
    const reponses = { 1: "régime général", 2: "URSSAF" };

    const details = buildQuestionDetails(emptyMatiere, reponses, [SOURCE_EXAMEN]);

    // EXPECTED: should fallback to SOURCE_EXAMEN's gestion questions
    // WILL FAIL: buggy code returns [] because rawQuestions is []
    expect(details.length).toBeGreaterThan(0);
    expect(details[0].questionId).toBe(1);
    expect(details[0].reponseEleve).toBe("régime général");
  });

  it("should work normally when matiere.questions is populated", () => {
    const reponses = { 1: "test", 3: ["A"] };
    const details = buildQuestionDetails(MATIERE_GESTION, reponses, [SOURCE_EXAMEN]);
    expect(details.length).toBe(3);
    expect(details[0].reponseEleve).toBe("test");
  });

  it("should handle string keys from JSON round-trip", () => {
    // After DB round-trip, object keys become strings
    const reponses = { "1": "test value" };
    const details = buildQuestionDetails(MATIERE_GESTION, reponses, [SOURCE_EXAMEN]);

    // EXPECTED: should find "1" even though question.id is number 1
    // WILL FAIL: buggy code does reponses?.[q.id] with no String fallback
    expect(details[0].reponseEleve).toBe("test value");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Bug GESTION-1: exerciceKey must be consistent between auto-save and flush
// ═══════════════════════════════════════════════════════════════════════════

describe("Bug GESTION-1: exerciceKey consistency", () => {
  it("auto-save and flush keys must be identical", () => {
    const autoSaveKey = buildExerciceKeyAutoSave("EB5", "gestion");
    const flushKey = buildExerciceKeyFlush("EB5", "gestion");

    // EXPECTED: same key
    // WILL FAIL: autoSave uses `_`, flush uses `__`
    expect(autoSaveKey).toBe(flushKey);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Bug GESTION-2: isExamPhaseProtected must protect "resultats" phase
// ═══════════════════════════════════════════════════════════════════════════

describe("Bug GESTION-2: resultats phase must be protected", () => {
  it("should protect resultats phase from examenChoisi replacement", () => {
    // EXPECTED: true (protected)
    // WILL FAIL: buggy code only checks examen and transition
    expect(isExamPhaseProtected("resultats")).toBe(true);
  });

  it("should protect examen phase", () => {
    expect(isExamPhaseProtected("examen")).toBe(true);
  });

  it("should protect transition phase", () => {
    expect(isExamPhaseProtected("transition")).toBe(true);
  });

  it("should NOT protect idle phase", () => {
    expect(isExamPhaseProtected("idle")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Bug GESTION-3: getQuestionKey must differentiate questions with same ID
// ═══════════════════════════════════════════════════════════════════════════

describe("Bug GESTION-3: getQuestionKey must prevent cross-exam collision", () => {
  it("EB1 id:2 and EB5 id:2 must produce DIFFERENT keys (different enonces)", () => {
    const eb1_q2 = { id: 2, type: "QRC", enonce: "Développez le sigle URSSAF." };
    const eb5_q2 = { id: 2, type: "QRC", enonce: "Qu'est-ce qu'une personne morale ?" };

    // EXPECTED: different keys
    // WILL FAIL: buggy code produces "2::QRC" for both
    expect(getQuestionKey(eb1_q2)).not.toBe(getQuestionKey(eb5_q2));
  });

  it("identical questions must produce same key", () => {
    const q1 = { id: 2, type: "QRC", enonce: "Same question text" };
    const q2 = { id: 2, type: "QRC", enonce: "Same question text" };
    expect(getQuestionKey(q1)).toBe(getQuestionKey(q2));
  });

  it("different type with same id and enonce must produce different keys", () => {
    const qcm = { id: 1, type: "QCM", enonce: "Question test" };
    const qrc = { id: 1, type: "QRC", enonce: "Question test" };
    expect(getQuestionKey(qcm)).not.toBe(getQuestionKey(qrc));
  });
});
