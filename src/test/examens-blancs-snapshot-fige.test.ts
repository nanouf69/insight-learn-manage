// @vitest-environment node
import { describe, it, expect } from "vitest";
import { resolveMatiereForScoring, computeMatiereScore } from "@/components/cours-en-ligne/examens-blancs-scoring";

const matiereActuelle: any = {
  id: "t3p", nom: "T3P", noteSur: 20, coefficient: 1, noteEliminatoire: 6,
  questions: [{ id: 1, type: "QCM", enonce: "Q modifiée AUJOURD'HUI", choix: [
    { lettre: "A", texte: "A", correct: false }, { lettre: "B", texte: "B", correct: true }] }],
};
const details: any = {
  reponses: { "1": "A" },
  snapshot: {
    version: 1, matiereId: "t3p", nom: "T3P", noteSur: 20, coefficient: 1, noteEliminatoire: 6,
    ptsQCM: 1, ptsQRC: 1, createdAt: "2026-09-01T10:00:00Z",
    questions: [{ id: 1, type: "QCM", enonce: "Q d'origine", ordre: 0, points: 1, choix: [
      { lettre: "A", texte: "A", correct: true }, { lettre: "B", texte: "B", correct: false }] }],
  },
};

describe("snapshot", () => {
  it("garde la version d'origine", () => {
    const m = resolveMatiereForScoring(matiereActuelle, details);
    expect(m.questions[0].enonce).toBe("Q d'origine");
    const s = computeMatiereScore(m, details.reponses, 0, 1, null);
    expect(s?.scoreObtenu).toBe(1); // A était la bonne réponse au moment du passage
  });
  it("sans snapshot, version actuelle", () => {
    const m = resolveMatiereForScoring(matiereActuelle, { reponses: {} });
    expect(m.questions[0].enonce).toBe("Q modifiée AUJOURD'HUI");
  });
});
