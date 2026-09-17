// @vitest-environment node
import { describe, it, expect } from "vitest";
import { computeMatiereScoreForAttempt } from "@/components/cours-en-ligne/examens-blancs-scoring";

const matiereTest: any = {
  id: "matiere_test_suppression",
  nom: "Matière de test",
  duree: 30,
  coefficient: 1,
  noteEliminatoire: 0,
  noteSur: 20,
  questions: [
    { id: 1, type: "QCM", enonce: "Q1", choix: [{ lettre: "A", texte: "a", correct: true }, { lettre: "B", texte: "b" }] },
    { id: 2, type: "QCM", enonce: "Q2", choix: [{ lettre: "A", texte: "a", correct: true }, { lettre: "B", texte: "b" }] },
  ],
};

describe("Anciennes tentatives sans snapshot : note figée", () => {
  it("garde la note enregistrée telle quelle", () => {
    const score = computeMatiereScoreForAttempt(matiereTest, {
      details: { reponses: { 1: ["A"], 2: ["B"] } },
      score_obtenu: 8,
      score_max: 10,
      note_sur_20: 16,
    });
    expect(score?.noteSur20).toBe(16);
    expect(score?.scoreObtenu).toBe(8);
  });

  it("ne change pas après suppression d'une question de la matière actuelle", () => {
    const apresSuppression = { ...matiereTest, questions: [matiereTest.questions[0]] };
    const score = computeMatiereScoreForAttempt(apresSuppression, {
      details: { reponses: { 1: ["A"], 2: ["B"] } },
      score_obtenu: 8,
      score_max: 10,
      note_sur_20: 16,
    });
    expect(score?.noteSur20).toBe(16);
    expect(score?.scoreObtenu).toBe(8);
    expect(score?.scoreMax).toBe(10);
  });

  it("ne change pas après modification de la bonne réponse", () => {
    const modifiee = {
      ...matiereTest,
      questions: [
        { id: 1, type: "QCM", enonce: "Q1", choix: [{ lettre: "A", texte: "a" }, { lettre: "B", texte: "b", correct: true }] },
        matiereTest.questions[1],
      ],
    };
    const score = computeMatiereScoreForAttempt(modifiee as any, {
      details: { reponses: { 1: ["A"], 2: ["B"] } },
      score_obtenu: 8,
      score_max: 10,
      note_sur_20: 16,
    });
    expect(score?.noteSur20).toBe(16);
  });

  it("utilise le snapshot quand il existe (nouvelles tentatives)", () => {
    const score = computeMatiereScoreForAttempt(matiereTest, {
      details: {
        snapshot: {
          version: 1,
          matiereId: "matiere_test_suppression",
          nom: "Matière de test",
          coefficient: 1,
          noteEliminatoire: 0,
          noteSur: 20,
          questions: [
            { id: 1, type: "QCM", enonce: "Q1", choix: [{ lettre: "A", texte: "a", correct: true }, { lettre: "B", texte: "b" }], ordre: 0 },
            { id: 2, type: "QCM", enonce: "Q2", choix: [{ lettre: "A", texte: "a", correct: true }, { lettre: "B", texte: "b" }], ordre: 1 },
          ],
        },
        reponses: { 1: ["A"], 2: ["A"] },
      },
      score_obtenu: 0,
      score_max: 0,
      note_sur_20: 0,
    });
    expect(score?.noteSur20).toBe(20);
  });
});
