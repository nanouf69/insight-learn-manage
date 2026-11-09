import { describe, it, expect } from "vitest";
import { questionsFaussesDuPassage } from "@/lib/revisionQuestionsFigees";
import type { Matiere } from "@/components/cours-en-ligne/examens-blancs-data";

const qcm = (id: number, correct: string[], enonce = `Q${id}`) => ({
  id, type: "QCM" as const, enonce, points: 1,
  choix: ["A", "B", "C"].map((l) => ({ lettre: l, texte: `t${l}`, correct: correct.includes(l) })),
});
const coreQ = (m: string, q: ReturnType<typeof qcm>) => ({ ...q, id: `${m}:${q.id}` });
const matiere = (questions: unknown[]) => ({ id: "gestion", nom: "Gestion", questions } as unknown as Matiere);

describe("Refaire les questions fausses — dernières réponses + corrigé admin actuel", () => {
  it("QCM multi : seule la combinaison exacte est juste (A+B)", () => {
    const m = matiere([qcm(1, ["A", "B"]), qcm(2, ["A", "B"]), qcm(3, ["A", "B"])]);
    const r = { matiereId: "gestion", reponses: { 1: ["B", "A"], 2: ["A"], 3: ["A", "B", "C"] } };
    expect(questionsFaussesDuPassage(m, r).fausses.map((f) => f.question.id)).toEqual([2, 3]);
  });
  it("corrigé admin modifié depuis : la question rapprochée utilise le corrigé actuel et la divergence est signalée", () => {
    const actuel = matiere([qcm(1, ["B"])]);
    const r = { matiereId: "gestion", reponses: { 1: ["A"] }, __core: { questions: [coreQ("gestion", qcm(1, ["A"]))] } };
    const b = questionsFaussesDuPassage(actuel, r);
    expect(b.fausses.map((f) => [f.question.id, f.corrige])).toEqual([[1, "actuel"]]);
    expect(b.divergencesCorrige).toEqual([1]);
  });
  it("énoncé changé : aucun rapprochement au hasard, corrigé figé + signalement", () => {
    const actuel = matiere([qcm(1, ["B"], "Autre énoncé")]);
    const r = { matiereId: "gestion", reponses: { 1: ["A"] }, __core: { questions: [coreQ("gestion", qcm(1, ["A"]))] } };
    const b = questionsFaussesDuPassage(actuel, r);
    expect(b.fausses).toEqual([]);
    expect(b.nonRapprochees).toEqual([1]);
  });
  it("QRC : note définitive partielle = fausse, pleine = juste, en attente = jamais fausse", () => {
    const qrc = (id: number) => ({ id: `gestion:${id}`, type: "QRC", enonce: `R${id}`, points: 2, reponseQRC: "x" });
    const r = {
      matiereId: "gestion", reponses: { 1: "a", 2: "b", 3: "c" },
      __core: { questions: [qrc(1), qrc(2), qrc(3)], qrcProofs: [
        { questionId: "gestion:1", etat: "corrigee", note: 1 },
        { questionId: "gestion:2", etat: "corrigee", note: 2 },
        { questionId: "gestion:3", etat: "en_attente", note: null },
      ] },
    };
    const b = questionsFaussesDuPassage(matiere([]), r as never);
    expect(b.fausses.map((f) => f.question.id)).toEqual([1]);
    expect(b.qrcEnAttente).toEqual([3]);
  });
  it("QRC ancien circuit sans correction : en attente, plus de devinette par mots-clés", () => {
    const m = matiere([{ id: 5, type: "QRC", enonce: "R", points: 2, reponses_possibles: ["zzz"] }]);
    const b = questionsFaussesDuPassage(m, { matiereId: "gestion", reponses: { 5: "abc" } });
    expect(b.fausses).toEqual([]);
    expect(b.qrcEnAttente).toEqual([5]);
  });
  it("QRC ancien circuit 1/2 = fausse (plus « > 0 = juste »)", () => {
    const m = matiere([{ id: 5, type: "QRC", enonce: "R", points: 2 }]);
    const b = questionsFaussesDuPassage(m, { matiereId: "gestion", reponses: { 5: "abc" }, correctionsIA: { 5: { pointsObtenus: 1 } } });
    expect(b.fausses.map((f) => f.question.id)).toEqual([5]);
  });
  it("réponse vide ignorée", () => {
    expect(questionsFaussesDuPassage(matiere([qcm(1, ["A"])]), { matiereId: "gestion", reponses: { 1: [] } }).fausses).toEqual([]);
  });
});
