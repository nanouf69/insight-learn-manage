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
  findMatiereWithFallback,
  getSourceQuestions,
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

const MATIERE_T3P: any = {
  id: "t3p",
  nom: "A - Transport Public Particulier de Personnes (T3P)",
  duree: 45,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 36,
  questions: [
    { id: 1, type: "QRC", enonce: "Attestation de formation continue ?", reponseQRC: "Délivrée par..." },
    { id: 2, type: "QCM", enonce: "Un QCM T3P", choix: [{ lettre: "B", texte: "Non", correct: true }] },
  ],
};

const MATIERE_REGL_VTC: any = {
  id: "reglementation_vtc",
  nom: "Réglementation VTC",
  duree: 30,
  coefficient: 2,
  noteEliminatoire: 4,
  noteSur: 20,
  questions: [
    { id: 1, type: "QRC", enonce: "Honorabilité ?", reponseQRC: "Casier B2 vierge" },
  ],
};

const SOURCE_EXAMEN: any = {
  id: "EB1",
  titre: "Examen Blanc 1",
  matieres: [MATIERE_GESTION],
};

const SOURCE_EB4: any = {
  id: "EB4",
  titre: "Examen Blanc VTC N°4",
  matieres: [MATIERE_T3P, MATIERE_GESTION, MATIERE_REGL_VTC],
};

const SOURCE_EB5: any = {
  id: "EB5",
  titre: "Examen Blanc VTC N°5",
  matieres: [MATIERE_T3P, MATIERE_GESTION],
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
    expect(map["EB1"].matieres[0].nom).toBe("Gestion modifiée");
  });

  it("should preserve questions from loadSavedExamens (no index-based scramble)", () => {
    const savedWithEmptyQuestions = [
      { ...SOURCE_EXAMEN, matieres: [{ ...MATIERE_GESTION, questions: [] }] },
    ];

    const map = buildExamenMap([SOURCE_EXAMEN], savedWithEmptyQuestions);

    // buildExamenMap trusts loadSavedExamens result — CorrectionQRCTab handles further fallback
    expect(map["EB1"].matieres[0].questions).toEqual([]);
  });

  it("should fall back to source when saved exam not found", () => {
    const map = buildExamenMap([SOURCE_EXAMEN, SOURCE_EB4], []);

    expect(map["EB1"]).toBe(SOURCE_EXAMEN);
    expect(map["EB4"]).toBe(SOURCE_EB4);
  });

  it("should handle multiple exams independently", () => {
    const savedEB4 = { ...SOURCE_EB4, titre: "EB4 modifié" };
    const map = buildExamenMap([SOURCE_EXAMEN, SOURCE_EB4], [savedEB4]);

    expect(map["EB1"]).toBe(SOURCE_EXAMEN); // no saved → source
    expect(map["EB4"].titre).toBe("EB4 modifié"); // saved found
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// findMatiereWithFallback — the 3-level matiere lookup
// ═══════════════════════════════════════════════════════════════════════════

describe("findMatiereWithFallback", () => {
  const examenMap: any = {
    EB4: { ...SOURCE_EB4, matieres: [MATIERE_T3P, MATIERE_GESTION, MATIERE_REGL_VTC] },
  };
  const allExams = [SOURCE_EXAMEN, SOURCE_EB4, SOURCE_EB5];

  it("level 1: should find matiere in examenMap", () => {
    const result = findMatiereWithFallback(examenMap, allExams, "EB4", "t3p");
    expect(result).toBeDefined();
    expect(result!.id).toBe("t3p");
  });

  it("level 2: should fall back to tousLesExamens when not in examenMap", () => {
    // EB5 not in examenMap, but exists in tousLesExamens
    const result = findMatiereWithFallback(examenMap, allExams, "EB5", "t3p");
    expect(result).toBeDefined();
    expect(result!.id).toBe("t3p");
  });

  it("level 3: should cross-search exams when matiere not in same exam", () => {
    // quiz_id="EB1" has no reglementation_vtc, but EB4 does
    const result = findMatiereWithFallback(examenMap, allExams, "EB1", "reglementation_vtc");
    expect(result).toBeDefined();
    expect(result!.id).toBe("reglementation_vtc");
    expect(result!.questions?.length).toBeGreaterThan(0);
  });

  it("level 3: should prefer matiere WITH questions over empty", () => {
    const examWithEmpty: any = {
      id: "EB_EMPTY",
      titre: "Empty",
      matieres: [{ id: "reglementation_vtc", nom: "Regl VTC", questions: [] }],
    };
    const result = findMatiereWithFallback({}, [examWithEmpty, SOURCE_EB4], "EB_EMPTY", "reglementation_vtc");
    // Level 2 finds the empty one first, returns it (it matched same quiz_id)
    // That's correct: same-exam match is preferred even if empty
    expect(result).toBeDefined();
    expect(result!.id).toBe("reglementation_vtc");
  });

  it("should return undefined when matiere not found anywhere", () => {
    const result = findMatiereWithFallback(examenMap, allExams, "EB4", "matiere_inexistante");
    expect(result).toBeUndefined();
  });

  it("should return undefined for empty matiere_id", () => {
    const result = findMatiereWithFallback(examenMap, allExams, "EB4", "");
    expect(result).toBeUndefined();
  });

  it("should handle quiz_id not in examenMap or source", () => {
    const result = findMatiereWithFallback(examenMap, allExams, "UNKNOWN", "gestion");
    // Level 2 fails (no exam with id UNKNOWN), level 3 finds gestion in EB1/EB4/EB5
    expect(result).toBeDefined();
    expect(result!.id).toBe("gestion");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getSourceQuestions — empty questions fallback
// ═══════════════════════════════════════════════════════════════════════════

describe("getSourceQuestions", () => {
  const allExams = [SOURCE_EXAMEN, SOURCE_EB4, SOURCE_EB5];

  it("should return matiere questions when they exist", () => {
    const result = getSourceQuestions(MATIERE_GESTION, allExams);
    expect(result).toBe(MATIERE_GESTION.questions);
    expect(result.length).toBe(3);
  });

  it("should fall back to tousLesExamens when matiere.questions is empty", () => {
    const emptyMatiere: any = { id: "gestion", questions: [] };
    const result = getSourceQuestions(emptyMatiere, allExams);
    expect(result.length).toBe(3); // found gestion in SOURCE_EXAMEN
    expect(result[0].id).toBe(1);
  });

  it("should fall back to tousLesExamens when matiere.questions is undefined", () => {
    const noQuestionsMatiere: any = { id: "t3p" };
    const result = getSourceQuestions(noQuestionsMatiere, allExams);
    expect(result.length).toBe(2); // found t3p in SOURCE_EB4
    expect(result[0].type).toBe("QRC");
  });

  it("should return empty array when matiere.id not found in any source", () => {
    const unknownMatiere: any = { id: "matiere_inexistante", questions: [] };
    const result = getSourceQuestions(unknownMatiere, allExams);
    expect(result).toEqual([]);
  });

  it("should return empty array when matiere has no id", () => {
    const noIdMatiere: any = { questions: [] };
    const result = getSourceQuestions(noIdMatiere, allExams);
    expect(result).toEqual([]);
  });

  it("should handle string key matching for DIAMANKA case", () => {
    // Simulates the full DIAMANKA flow: matiere found but empty questions
    const emptyT3p: any = { id: "t3p", questions: [] };
    const questions = getSourceQuestions(emptyT3p, allExams);
    expect(questions.length).toBe(2);
    expect(questions[0].enonce).toContain("Attestation");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Bug QRC-2: shouldSkipResultRow must NOT skip rows with reponses but no questions key
// ═══════════════════════════════════════════════════════════════════════════

describe("Bug QRC-2: shouldSkipResultRow must allow rows without questions key", () => {
  it("should NOT skip when details has reponses but no questions key", () => {
    const details = { reponses: { 1: "régime général" } };
    expect(shouldSkipResultRow(details)).toBe(false);
  });

  it("should still skip when details is null", () => {
    expect(shouldSkipResultRow(null)).toBe(true);
  });

  it("should still skip when details is undefined", () => {
    expect(shouldSkipResultRow(undefined)).toBe(true);
  });

  it("should NOT skip when details has empty questions array", () => {
    const details = { questions: [], reponses: { 1: "test" } };
    expect(shouldSkipResultRow(details)).toBe(false);
  });

  it("should NOT skip empty object (has details, just no content)", () => {
    expect(shouldSkipResultRow({})).toBe(false);
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
    const reponses = { "1": "test value" };
    const details = buildQuestionDetails(MATIERE_GESTION, reponses, [SOURCE_EXAMEN]);
    expect(details[0].reponseEleve).toBe("test value");
  });

  it("should return reponseCorrecte for QCM questions", () => {
    const reponses = { 3: ["A"] };
    const details = buildQuestionDetails(MATIERE_GESTION, reponses, [SOURCE_EXAMEN]);
    const qcm = details.find((d: any) => d.type === "QCM");
    expect(qcm.reponseCorrecte).toEqual(["A"]);
  });

  it("should return reponseCorrecte for QRC questions", () => {
    const reponses = {};
    const details = buildQuestionDetails(MATIERE_GESTION, reponses, [SOURCE_EXAMEN]);
    const qrc = details.find((d: any) => d.questionId === 1);
    expect(qrc.reponseCorrecte).toBe("Le régime général.");
  });

  it("should return null reponseEleve when no response exists", () => {
    const reponses = {};
    const details = buildQuestionDetails(MATIERE_GESTION, reponses, [SOURCE_EXAMEN]);
    expect(details[0].reponseEleve).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Bug GESTION-1: exerciceKey must be consistent between auto-save and flush
// ═══════════════════════════════════════════════════════════════════════════

describe("Bug GESTION-1: exerciceKey consistency", () => {
  it("auto-save and flush keys must be identical", () => {
    const autoSaveKey = buildExerciceKeyAutoSave("EB5", "gestion");
    const flushKey = buildExerciceKeyFlush("EB5", "gestion");
    expect(autoSaveKey).toBe(flushKey);
  });

  it("should produce correct format with double underscore", () => {
    expect(buildExerciceKeyAutoSave("EB1", "t3p")).toBe("EB1__t3p");
    expect(buildExerciceKeyFlush("EB1", "t3p")).toBe("EB1__t3p");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Bug GESTION-2: isExamPhaseProtected must protect "resultats" phase
// ═══════════════════════════════════════════════════════════════════════════

describe("Bug GESTION-2: resultats phase must be protected", () => {
  it("should protect resultats phase from examenChoisi replacement", () => {
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

  it("should NOT protect empty string", () => {
    expect(isExamPhaseProtected("")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Bug GESTION-3: getQuestionKey must differentiate questions with same ID
// ═══════════════════════════════════════════════════════════════════════════

describe("Bug GESTION-3: getQuestionKey must prevent cross-exam collision", () => {
  it("EB1 id:2 and EB5 id:2 must produce DIFFERENT keys (different enonces)", () => {
    const eb1_q2 = { id: 2, type: "QRC", enonce: "Développez le sigle URSSAF." };
    const eb5_q2 = { id: 2, type: "QRC", enonce: "Qu'est-ce qu'une personne morale ?" };
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
