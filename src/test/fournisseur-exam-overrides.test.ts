import { describe, it, expect } from "vitest";
import {
  applyFournisseurOverridesToExamens,
  FOURNISSEUR_QUIZ_TO_EXAM,
} from "@/components/cours-en-ligne/fournisseur-exam-overrides";

/**
 * Bug Rim TOUIL: la formatrice modifie une réponse dans bilan-examen-ta via le
 * portail fournisseur, mais l'étudiant ne voit pas la modification quand il
 * passe le bilan examen blanc TA.
 *
 * Cause: loadSavedExamens lit uniquement module_editor_state, pas
 * quiz_questions_overrides. Les modifs fournisseur ne sont jamais appliquées
 * sur les examens blancs.
 *
 * Fix: applyFournisseurOverridesToExamens applique les overrides sur les
 * matieres des examens blancs.
 */

const makeQ = (id: number, enonce: string, correctLetter: string = "A") => ({
  id,
  type: "QCM" as const,
  enonce,
  choix: [
    { lettre: "A", texte: "Choix A", correct: correctLetter === "A" },
    { lettre: "B", texte: "Choix B", correct: correctLetter === "B" },
    { lettre: "C", texte: "Choix C", correct: correctLetter === "C" },
  ],
});

const makeBilanTA = (matieres: any[]) => ({
  id: "bilan-ta",
  numero: 8,
  type: "TAXI" as const,
  titre: "Bilan Examen TA",
  matieres,
});

describe("applyFournisseurOverridesToExamens — bug Rim TOUIL", () => {
  it("applique l'override fournisseur sur la question correspondante de l'examen blanc TA", () => {
    const examens = [
      makeBilanTA([
        {
          id: "bilan_reglementation_taxi",
          nom: "F - Réglementation Nationale TAXI",
          duree: 60,
          coefficient: 3,
          noteEliminatoire: 0,
          noteSur: 2,
          questions: [makeQ(1, "Q1 originale", "A"), makeQ(2, "Q2 originale", "B")],
        },
      ]),
    ] as any;

    const overrides = [
      {
        quiz_id: "bilan-examen-ta",
        section_id: 700, // baseId TA = 700, matiere[0]
        question_id: 1,
        enonce: "Q1 modifiée par formatrice",
        choix: [
          { lettre: "A", texte: "A", correct: false },
          { lettre: "B", texte: "B", correct: true }, // bonne réponse changée vers B
          { lettre: "C", texte: "C", correct: false },
        ],
        updated_at: "2026-05-08T14:00:00Z",
      },
    ];

    const result = applyFournisseurOverridesToExamens(examens, overrides);
    const q1 = result[0].matieres[0].questions[0];
    expect(q1.enonce).toBe("Q1 modifiée par formatrice");
    expect(q1.choix.find((c: any) => c.correct)?.lettre).toBe("B");
  });

  it("supporte plusieurs matieres (matiereIndex calculé via section_id - baseSectionId)", () => {
    const examens = [
      makeBilanTA([
        {
          id: "matiere_0",
          nom: "Matiere 0",
          duree: 60,
          coefficient: 3,
          noteEliminatoire: 0,
          noteSur: 1,
          questions: [makeQ(1, "M0Q1")],
        },
        {
          id: "matiere_1",
          nom: "Matiere 1",
          duree: 60,
          coefficient: 3,
          noteEliminatoire: 0,
          noteSur: 1,
          questions: [makeQ(1, "M1Q1")],
        },
      ]),
    ] as any;

    const overrides = [
      {
        quiz_id: "bilan-examen-ta",
        section_id: 701, // matiere[1]
        question_id: 1,
        enonce: "M1Q1 modifié",
        choix: [
          { lettre: "A", texte: "A", correct: true },
          { lettre: "B", texte: "B", correct: false },
        ],
        updated_at: "2026-05-08T14:00:00Z",
      },
    ];

    const result = applyFournisseurOverridesToExamens(examens, overrides);
    expect(result[0].matieres[0].questions[0].enonce).toBe("M0Q1"); // inchangé
    expect(result[0].matieres[1].questions[0].enonce).toBe("M1Q1 modifié");
  });

  it("ignore les overrides sans mapping (quiz_id inconnu)", () => {
    const examens = [
      makeBilanTA([
        {
          id: "matiere_0",
          nom: "M0",
          duree: 60,
          coefficient: 3,
          noteEliminatoire: 0,
          noteSur: 1,
          questions: [makeQ(1, "Q1")],
        },
      ]),
    ] as any;

    const overrides = [
      {
        quiz_id: "quiz-inconnu",
        section_id: 100,
        question_id: 1,
        enonce: "Modif",
        choix: [],
        updated_at: "2026-05-08T14:00:00Z",
      },
    ];

    const result = applyFournisseurOverridesToExamens(examens, overrides);
    expect(result[0].matieres[0].questions[0].enonce).toBe("Q1");
  });

  it("supporte la suppression via __DELETED__", () => {
    const examens = [
      makeBilanTA([
        {
          id: "m",
          nom: "M",
          duree: 60,
          coefficient: 3,
          noteEliminatoire: 0,
          noteSur: 3,
          questions: [makeQ(1, "Q1"), makeQ(2, "Q2"), makeQ(3, "Q3")],
        },
      ]),
    ] as any;

    const overrides = [
      {
        quiz_id: "bilan-examen-ta",
        section_id: 700,
        question_id: 2,
        enonce: "__DELETED__",
        choix: [],
        updated_at: "2026-05-08T14:00:00Z",
      },
    ];

    const result = applyFournisseurOverridesToExamens(examens, overrides);
    const ids = result[0].matieres[0].questions.map((q: any) => q.id);
    expect(ids).toEqual([1, 3]);
  });

  it("last-write-wins quand 2 overrides sur la même question", () => {
    const examens = [
      makeBilanTA([
        {
          id: "m",
          nom: "M",
          duree: 60,
          coefficient: 3,
          noteEliminatoire: 0,
          noteSur: 1,
          questions: [makeQ(1, "Q1 source")],
        },
      ]),
    ] as any;

    const overrides = [
      {
        quiz_id: "bilan-examen-ta",
        section_id: 700,
        question_id: 1,
        enonce: "Ancienne version",
        choix: [{ lettre: "A", texte: "A", correct: true }],
        updated_at: "2026-05-01T10:00:00Z",
      },
      {
        quiz_id: "bilan-examen-ta",
        section_id: 700,
        question_id: 1,
        enonce: "Nouvelle version",
        choix: [{ lettre: "B", texte: "B", correct: true }],
        updated_at: "2026-05-08T14:00:00Z",
      },
    ];

    const result = applyFournisseurOverridesToExamens(examens, overrides);
    expect(result[0].matieres[0].questions[0].enonce).toBe("Nouvelle version");
  });

  it("mapping FOURNISSEUR_QUIZ_TO_EXAM couvre les 4 bilans (TA, VTC, TAXI, VA)", () => {
    expect(FOURNISSEUR_QUIZ_TO_EXAM["bilan-examen-ta"]).toEqual({ examId: "bilan-ta", baseSectionId: 700 });
    expect(FOURNISSEUR_QUIZ_TO_EXAM["bilan-examen-vtc"]).toEqual({ examId: "bilan-vtc", baseSectionId: 500 });
    expect(FOURNISSEUR_QUIZ_TO_EXAM["bilan-examen-taxi"]).toEqual({ examId: "bilan-taxi", baseSectionId: 600 });
    expect(FOURNISSEUR_QUIZ_TO_EXAM["bilan-examen-va"]).toEqual({ examId: "bilan-va", baseSectionId: 600 });
  });

  it("ignore les sections hors range", () => {
    const examens = [
      makeBilanTA([
        {
          id: "m",
          nom: "M",
          duree: 60,
          coefficient: 3,
          noteEliminatoire: 0,
          noteSur: 1,
          questions: [makeQ(1, "Q1")],
        },
      ]),
    ] as any;

    const overrides = [
      {
        quiz_id: "bilan-examen-ta",
        section_id: 999, // hors range
        question_id: 1,
        enonce: "X",
        choix: [],
        updated_at: "2026-05-08T14:00:00Z",
      },
    ];

    const result = applyFournisseurOverridesToExamens(examens, overrides);
    expect(result[0].matieres[0].questions[0].enonce).toBe("Q1");
  });
});
