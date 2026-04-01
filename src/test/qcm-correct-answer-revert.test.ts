/**
 * TDD tests for BUG: admin changes QCM correct answer,
 * but it reverts after reload because sync functions overwrite merged saved data.
 *
 * Root cause: syncVtcTaxiMatieres runs AFTER merge in loadSavedExamens,
 * deep-cloning VTC matières → overwriting TAXI's correctly merged saved data.
 */
import { describe, it, expect } from "vitest";
import {
  mergeQuestionsForMatiere,
} from "../components/cours-en-ligne/examens-blancs-utils";
import type { Question, Matiere, ExamenBlanc } from "../components/cours-en-ligne/examens-blancs-types";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function makeChoix(lettre: string, texte: string, correct?: boolean) {
  return { lettre, texte, ...(correct !== undefined ? { correct } : {}) };
}

function makeQcm(id: number, enonce: string, choix: ReturnType<typeof makeChoix>[]): Question {
  return { id, type: "QCM", enonce, choix };
}

function makeMatiere(id: string, nom: string, questions: Question[]): Matiere {
  return {
    id,
    nom,
    duree: 30,
    coefficient: 1,
    noteEliminatoire: 0,
    noteSur: 20,
    questions,
  } as Matiere;
}

// ────────────────────────────────────────────────────────────
// 1. mergeQuestionsForMatiere preserves correct answer changes
// ────────────────────────────────────────────────────────────

describe("BUG — QCM correct answer revert: mergeQuestionsForMatiere", () => {
  it("preserves admin's changed correct answer after merge", () => {
    const source: Question[] = [
      makeQcm(1, "Question 1", [
        makeChoix("A", "Choix A", true),
        makeChoix("B", "Choix B"),
        makeChoix("C", "Choix C"),
      ]),
    ];

    // Admin changed correct from A to B
    const saved: Question[] = [
      makeQcm(1, "Question 1", [
        makeChoix("A", "Choix A", false),
        makeChoix("B", "Choix B", true),
        makeChoix("C", "Choix C", false),
      ]),
    ];

    const merged = mergeQuestionsForMatiere(source, saved);
    expect(merged).toHaveLength(1);
    expect(merged[0].choix![0].correct).toBe(false);  // A was unchecked
    expect(merged[0].choix![1].correct).toBe(true);    // B is now correct
    expect(merged[0].choix![2].correct).toBe(false);   // C unchanged
  });

  it("preserves correct answer after JSON round-trip (simulates DB storage)", () => {
    const source: Question[] = [
      makeQcm(1, "Question 1", [
        makeChoix("A", "Choix A", true),
        makeChoix("B", "Choix B"),
      ]),
    ];

    // Simulate admin edit + JSON round-trip (save to DB then load)
    const adminEdit: Question[] = [
      makeQcm(1, "Question 1", [
        makeChoix("A", "Choix A", false),
        makeChoix("B", "Choix B", true),
      ]),
    ];
    const savedFromDB: Question[] = JSON.parse(JSON.stringify(adminEdit));

    const merged = mergeQuestionsForMatiere(source, savedFromDB);
    expect(merged[0].choix![0].correct).toBe(false);
    expect(merged[0].choix![1].correct).toBe(true);
  });

  it("preserves correct answer when correct:undefined is stripped by JSON", () => {
    const source: Question[] = [
      makeQcm(1, "Question 1", [
        makeChoix("A", "Choix A", true),
        makeChoix("B", "Choix B"),       // correct: undefined
        makeChoix("C", "Choix C"),       // correct: undefined
      ]),
    ];

    // Admin changed correct from A to C. B never had correct field.
    const adminEdit: Question[] = [
      makeQcm(1, "Question 1", [
        makeChoix("A", "Choix A", false),
        makeChoix("B", "Choix B"),        // still undefined
        makeChoix("C", "Choix C", true),
      ]),
    ];
    // JSON round-trip strips undefined, keeps false
    const savedFromDB: Question[] = JSON.parse(JSON.stringify(adminEdit));

    const merged = mergeQuestionsForMatiere(source, savedFromDB);
    expect(merged[0].choix![0].correct).toBe(false);
    expect(merged[0].choix![1].correct).toBeUndefined(); // no correct field
    expect(merged[0].choix![2].correct).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// 2. Sync functions must NOT overwrite merged saved data
// ────────────────────────────────────────────────────────────

/**
 * propagateSharedMatiereEdit: when admin edits a shared matière,
 * all exams with the same matière ID should get the update.
 * This is the function we need to create and use in handleMatiereChange.
 */
import {
  propagateSharedMatiereEdit,
} from "../components/cours-en-ligne/examens-blancs-utils";

describe("BUG — QCM correct answer revert: shared matière edit propagation", () => {
  function makeMinimalExamens(): ExamenBlanc[] {
    const sharedMatieres = [
      makeMatiere("t3p", "T3P", [
        makeQcm(1, "Q1", [makeChoix("A", "A", true), makeChoix("B", "B")]),
      ]),
    ];
    const vtc1: ExamenBlanc = {
      id: "EB1", type: "VTC", numero: 1,
      matieres: JSON.parse(JSON.stringify(sharedMatieres)),
    } as ExamenBlanc;
    const taxi1: ExamenBlanc = {
      id: "EB1-TAXI", type: "TAXI", numero: 1,
      matieres: JSON.parse(JSON.stringify(sharedMatieres)),
    } as ExamenBlanc;
    return [vtc1, taxi1];
  }

  it("editing correct answer on one exam propagates to all exams with same matière", () => {
    const examens = makeMinimalExamens();

    // Admin changes correct from A to B on VTC's t3p matière
    const updatedMatiere = makeMatiere("t3p", "T3P", [
      makeQcm(1, "Q1", [makeChoix("A", "A", false), makeChoix("B", "B", true)]),
    ]);

    const result = propagateSharedMatiereEdit(examens, "t3p", updatedMatiere);

    // Both VTC and TAXI should have B as correct
    expect(result[0].matieres[0].questions[0].choix![1].correct).toBe(true);
    expect(result[1].matieres[0].questions[0].choix![1].correct).toBe(true);
    expect(result[0].matieres[0].questions[0].choix![0].correct).toBe(false);
    expect(result[1].matieres[0].questions[0].choix![0].correct).toBe(false);
  });

  it("editing correct answer on TAXI propagates back to VTC", () => {
    const examens = makeMinimalExamens();

    // Admin changes correct from A to B on TAXI's t3p matière
    const updatedMatiere = makeMatiere("t3p", "T3P", [
      makeQcm(1, "Q1", [makeChoix("A", "A", false), makeChoix("B", "B", true)]),
    ]);

    const result = propagateSharedMatiereEdit(examens, "t3p", updatedMatiere);

    // VTC should also have B as correct (not stale A)
    expect(result[0].matieres[0].questions[0].choix![1].correct).toBe(true);
    expect(result[0].matieres[0].questions[0].choix![0].correct).toBe(false);
  });

  it("editing non-shared matière does NOT affect other exams", () => {
    const examens = makeMinimalExamens();
    // Add a non-shared matière to VTC only
    examens[0].matieres.push(
      makeMatiere("reglementation_vtc", "Réglementation VTC", [
        makeQcm(10, "Q10", [makeChoix("A", "A", true), makeChoix("B", "B")]),
      ]),
    );

    const updatedMatiere = makeMatiere("reglementation_vtc", "Réglementation VTC", [
      makeQcm(10, "Q10", [makeChoix("A", "A", false), makeChoix("B", "B", true)]),
    ]);

    const result = propagateSharedMatiereEdit(examens, "reglementation_vtc", updatedMatiere);

    // VTC matière updated
    expect(result[0].matieres[1].questions[0].choix![1].correct).toBe(true);
    // TAXI unaffected (doesn't have this matière)
    expect(result[1].matieres).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────────────────
// 3. Full round-trip: edit → save → reload → correct answer preserved
// ────────────────────────────────────────────────────────────

describe("BUG — Full round-trip: admin correct answer survives save+reload", () => {
  it("correct answer change survives merge when saved data has updated choix", () => {
    // Source question: A is correct
    const sourceQ = makeQcm(1, "Quelle est la vitesse max ?", [
      makeChoix("A", "50 km/h", true),
      makeChoix("B", "70 km/h"),
      makeChoix("C", "90 km/h"),
    ]);

    // Admin changes correct to C, saves, data stored in DB
    const savedQ = makeQcm(1, "Quelle est la vitesse max ?", [
      makeChoix("A", "50 km/h", false),
      makeChoix("B", "70 km/h", false),
      makeChoix("C", "90 km/h", true),
    ]);
    // Simulate DB round-trip
    const savedFromDB = JSON.parse(JSON.stringify(savedQ));

    // Merge (as loadSavedExamens does)
    const merged = mergeQuestionsForMatiere([sourceQ], [savedFromDB]);

    // Correct answer must be C, not A
    expect(merged[0].choix!.find(c => c.correct === true)?.lettre).toBe("C");
    expect(merged[0].choix!.find(c => c.lettre === "A")?.correct).toBe(false);
  });

  it("multiple questions: only the changed question is affected", () => {
    const source: Question[] = [
      makeQcm(1, "Q1", [makeChoix("A", "A", true), makeChoix("B", "B")]),
      makeQcm(2, "Q2", [makeChoix("A", "A"), makeChoix("B", "B", true)]),
    ];

    // Admin changed Q2 correct from B to A. Q1 unchanged.
    const saved: Question[] = [
      makeQcm(1, "Q1", [makeChoix("A", "A", true), makeChoix("B", "B")]),
      makeQcm(2, "Q2", [makeChoix("A", "A", true), makeChoix("B", "B", false)]),
    ];
    const savedFromDB = JSON.parse(JSON.stringify(saved));

    const merged = mergeQuestionsForMatiere(source, savedFromDB);
    // Q1 unchanged
    expect(merged[0].choix![0].correct).toBe(true);
    // Q2 changed
    expect(merged[1].choix![0].correct).toBe(true);
    expect(merged[1].choix![1].correct).toBe(false);
  });

  it("admin adds a new correct choice — survives round-trip", () => {
    const source: Question[] = [
      makeQcm(1, "Q1", [
        makeChoix("A", "A", true),
        makeChoix("B", "B"),
      ]),
    ];

    // Admin added choice C and made it the correct answer
    const saved: Question[] = [
      makeQcm(1, "Q1", [
        makeChoix("A", "A", false),
        makeChoix("B", "B", false),
        makeChoix("C", "Nouveau choix", true),
      ]),
    ];
    const savedFromDB = JSON.parse(JSON.stringify(saved));

    const merged = mergeQuestionsForMatiere(source, savedFromDB);
    expect(merged[0].choix).toHaveLength(3);
    expect(merged[0].choix![2].correct).toBe(true);
    expect(merged[0].choix![2].texte).toBe("Nouveau choix");
  });
});
