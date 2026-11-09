// @vitest-environment node
import { describe, expect, it } from "vitest";
import { questionsRevisionDuPassage, reponseCorrecteDansRevision } from "@/lib/revisionQuestionsFigees";

const matiere: any = { id: "gestion", nom: "Gestion", noteSur: 20, coefficient: 1, noteEliminatoire: 6, questions: [{ id: 1, type: "QCM", enonce: "Version courante", choix: [{ lettre: "A", correct: false }, { lettre: "B", correct: true }] }] };

describe("révision depuis le bon passage", () => {
  it("ignore la clé courante après modification et conserve l'ordre du snapshot", () => {
    const passage = {
      matiereId: "gestion",
      reponses: { 1: ["A"] },
      __core: { questions: [
        { id: "gestion:2", type: "QRC", enonce: "QRC figée", points: 2 },
        { id: "gestion:1", type: "QCM", enonce: "QCM figé", points: 1, choix: [{ lettre: "A", correct: true }, { lettre: "B" }] },
      ] },
    };
    const questions = questionsRevisionDuPassage(matiere, passage);
    expect(questions.map((q) => [q.id, q.enonce])).toEqual([[2, "QRC figée"], [1, "QCM figé"]]);
    expect(reponseCorrecteDansRevision(questions[1], ["A"], matiere, passage)).toBe(true);
  });

  it("utilise la note QRC validée de cette tentative, y compris partielle", () => {
    const question: any = { id: 2, type: "QRC", enonce: "QRC figée", points: 2 };
    const base = { matiereId: "gestion", __core: { qrcProofs: [{ questionId: "gestion:2", etat: "corrigee", note: 1 }] } };
    expect(reponseCorrecteDansRevision(question, "réponse", matiere, base)).toBe(false);
    expect(reponseCorrecteDansRevision(question, "réponse", matiere, { ...base, __core: { qrcProofs: [{ questionId: "gestion:2", etat: "corrigee", note: 2 }] } })).toBe(true);
  });

  it("ne fabrique pas de question si le snapshot est incomplet", () => {
    expect(questionsRevisionDuPassage(matiere, { matiereId: "gestion", __core: { questions: [{ id: "gestion:1", type: "QCM", points: null }] } })).toEqual([]);
  });
});

describe("compteur Refaire = réponses du passage, pas le contenu actuel", () => {
  it("Q9 A+B correcte dans le snapshot n'est pas fausse même si l'admin a changé la clé ensuite", async () => {
    const { questionsRevisionDuPassage, reponseCorrecteDansRevision } = await import("@/lib/revisionQuestionsFigees");
    const matiere: any = { id: "securite", nom: "Sécurité", questions: [{ id: 9, type: "QCM", points: 1, enonce: "x", choix: [{ lettre: "A", correct: true }, { lettre: "B", correct: false }] }] };
    const r: any = { matiereId: "securite", reponses: { "9": ["B", "A"] }, __core: { questions: [{ id: "securite:9", type: "QCM", points: 1, enonce: "x", choix: [{ lettre: "A", correct: true }, { lettre: "B", correct: true }] }] } };
    const qs = questionsRevisionDuPassage(matiere, r);
    expect(qs).toHaveLength(1);
    expect(reponseCorrecteDansRevision(qs[0], r.reponses["9"], { ...matiere, questions: qs }, r)).toBe(true);
  });
});
