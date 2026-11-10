import { describe, expect, it } from "vitest";
import { isBilanAnswerCorrect } from "@/components/cours-en-ligne/examens-blancs-utils";
import { computeMatiereScoreFromReponses, resolveMatiereForScoring } from "@/components/cours-en-ligne/examens-blancs-scoring";
import type { Matiere } from "@/components/cours-en-ligne/examens-blancs-data";

const choix = [
  { lettre: "A", texte: "tracasser", correct: true },
  { lettre: "B", texte: "interpeller", correct: false },
  { lettre: "C", texte: "taquiner", correct: true },
];
const matiere: Matiere = {
  id: "francais", nom: "D Français", duree: 30, coefficient: 2,
  noteEliminatoire: 6, noteSur: 20,
  questions: [{ id: 4, type: "QCM", enonce: "Donnez un synonyme du verbe 'titiller'", points: 2, choix }],
};

describe("QCM : égalité exacte, aucun point partiel", () => {
  it.each([
    [["A", "C"], 2], [["C", "A"], 2], [["A"], 0], [["C"], 0],
    [["A", "B", "C"], 0], [["B"], 0], [[], 0], [["A", "B"], 0], [["B", "C"], 0],
  ] as [string[], number][])("titiller %j rapporte %s/2", (answer, points) => {
    expect(computeMatiereScoreFromReponses(matiere, { "4": answer })?.scoreObtenu ?? 0).toBe(points);
    expect(isBilanAnswerCorrect(answer, choix)).toBe(points === 2);
  });
  it("une seule bonne réponse exige aussi l'ensemble exact", () => {
    const unique = choix.map(c => ({ ...c, correct: c.lettre === "C" }));
    expect(isBilanAnswerCorrect(["C"], unique)).toBe(true);
    expect(isBilanAnswerCorrect(["A", "C"], unique)).toBe(false);
  });
  it("le nouveau corrigé A+C ne remplace pas le snapshot historique C", () => {
    const details = { snapshot: {
      version: 1, matiereId: "francais", noteSur: 20, coefficient: 2, noteEliminatoire: 6,
      questions: [{ ...matiere.questions[0], choix: choix.map(c => ({ ...c, correct: c.lettre === "C" })) }],
    } };
    const frozen = resolveMatiereForScoring(matiere, details);
    expect(computeMatiereScoreFromReponses(frozen, { "4": ["C"] })?.scoreObtenu).toBe(2);
    expect(computeMatiereScoreFromReponses(frozen, { "4": ["A", "C"] })?.scoreObtenu).toBe(0);
    expect(matiere.questions[0].choix?.filter(c => c.correct).map(c => c.lettre)).toEqual(["A", "C"]);
  });
});