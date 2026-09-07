import { describe, it, expect } from "vitest";
import {
  applyFournisseurOverridesToExamens,
  FOURNISSEUR_QUIZ_TO_EXAM,
} from "@/components/cours-en-ligne/fournisseur-exam-overrides";

/** Régression : dernière modification enregistrée = version officielle. */

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

const makeExam = (id: string, matieres: any[]) => ({
  id,
  numero: 1,
  type: "TAXI" as const,
  titre: id,
  matieres,
});

const oneMatiere = (questions: any[]) => [
  {
    id: "m0",
    nom: "M0",
    duree: 60,
    coefficient: 3,
    noteEliminatoire: 0,
    noteSur: questions.length,
    questions,
  },
];

describe("applyFournisseurOverridesToExamens — dernière version enregistrée", () => {
  it.each([
    ["bilan-examen-ta",  "bilan-ta",   700],
    ["bilan-examen-vtc", "bilan-vtc",  500],
    ["bilan-examen-taxi","bilan-taxi", 600],
    ["bilan-examen-va",  "bilan-va",   600],
  ])("applique le fournisseur sur %s quand l'admin n'a pas de date", (quizId, examId, base) => {
    const examens = [makeExam(examId, oneMatiere([makeQ(1, "Version admin", "C")]))] as any;

    const overrides = [
      {
        quiz_id: quizId,
        section_id: base,
        question_id: 1,
        enonce: "Ancienne réponse fournisseur",
        choix: [
          { lettre: "A", texte: "A", correct: true },
          { lettre: "B", texte: "B", correct: false },
          { lettre: "C", texte: "C", correct: false },
        ],
        updated_at: "2026-07-23T11:00:00Z",
      },
    ];

    const result = applyFournisseurOverridesToExamens(examens, overrides);
    const q1 = result[0].matieres[0].questions[0];
    expect(q1.enonce).toBe("Ancienne réponse fournisseur");
    expect(q1.choix.find((c: any) => c.correct)?.lettre).toBe("A");
  });

  it("applique le fournisseur quand son updated_at est plus récent", () => {
    const examens = [
      makeExam(
        "bilan-ta",
        oneMatiere([
          { ...makeQ(1, "Version admin", "C"), manually_edited: true, _editedAt: "2026-07-23T10:00:00Z" },
        ]),
      ),
    ] as any;

    const overrides = [
      {
        quiz_id: "bilan-examen-ta",
        section_id: 700,
        question_id: 1,
        enonce: "Version fournisseur postérieure",
        choix: [{ lettre: "A", texte: "A", correct: true }],
        updated_at: "2026-07-23T11:00:00Z",
      },
    ];

    const result = applyFournisseurOverridesToExamens(examens, overrides);
    const q1 = result[0].matieres[0].questions[0];
    expect(q1.enonce).toBe("Version fournisseur postérieure");
    expect(q1.choix.find((c: any) => c.correct)?.lettre).toBe("A");
  });

  it("applique une suppression fournisseur plus récente", () => {
    const examens = [
      makeExam("bilan-taxi", oneMatiere([makeQ(1, "Q1"), makeQ(2, "Q2"), makeQ(3, "Q3")])),
    ] as any;

    const overrides = [
      {
        quiz_id: "bilan-examen-taxi",
        section_id: 600,
        question_id: 2,
        enonce: "__DELETED__",
        choix: [],
        updated_at: "2026-07-23T11:00:00Z",
      },
    ];

    const result = applyFournisseurOverridesToExamens(examens, overrides);
    const ids = result[0].matieres[0].questions.map((q: any) => q.id);
    expect(ids).toEqual([1, 3]);
  });

  it("ignore les overrides sans mapping (quiz_id inconnu)", () => {
    const examens = [makeExam("bilan-vtc", oneMatiere([makeQ(1, "Q1")]))] as any;
    const result = applyFournisseurOverridesToExamens(examens, [
      {
        quiz_id: "quiz-inconnu",
        section_id: 100,
        question_id: 1,
        enonce: "Modif",
        choix: [],
        updated_at: "2026-05-08T14:00:00Z",
      },
    ]);
    expect(result[0].matieres[0].questions[0].enonce).toBe("Q1");
  });

  it("mapping FOURNISSEUR_QUIZ_TO_EXAM couvre les 4 bilans (TA, VTC, TAXI, VA)", () => {
    expect(FOURNISSEUR_QUIZ_TO_EXAM["bilan-examen-ta"]).toEqual({ examId: "bilan-ta", baseSectionId: 700 });
    expect(FOURNISSEUR_QUIZ_TO_EXAM["bilan-examen-vtc"]).toEqual({ examId: "bilan-vtc", baseSectionId: 500 });
    expect(FOURNISSEUR_QUIZ_TO_EXAM["bilan-examen-taxi"]).toEqual({ examId: "bilan-taxi", baseSectionId: 600 });
    expect(FOURNISSEUR_QUIZ_TO_EXAM["bilan-examen-va"]).toEqual({ examId: "bilan-va", baseSectionId: 600 });
  });
});
