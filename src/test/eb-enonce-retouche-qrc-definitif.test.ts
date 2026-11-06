// @vitest-environment node
// Cas HASNAT 06/11 (données fictives) : EB1 Gestion, 2 QRC corrigées 0/2 par le formateur,
// note serveur définitive 7/20 ; seul l'énoncé de Q15 a été retouché après le passage.
import { describe, expect, it } from "vitest";
import { attacherSourceUnique, noteExamenAffichee } from "@/lib/noteExamenAffichee";
import type { CoreMatiereState } from "@/lib/coreExamPublication";

const moteur = [
  { id: "gestion:1", ordre: 1, type: "QRC", enonce: "Organisme ?", reponseQRC: "URSSAF" },
  { id: "gestion:2", ordre: 2, type: "QCM", enonce: "L'annuité est de 5 600 €. Coût ?", choix: [{ lettre: "A", texte: "2000 €" }, { lettre: "B", texte: "3000 €", correct: true }] },
];
const fiche = [
  { id: 1, ordre: 0, type: "QRC", enonce: "Organisme ?", reponseQRC: "URSSAF" },
  { id: 2, ordre: 1, type: "QCM", enonce: "L'annuité (ce qu'on paie par an) est de 5 600 €. Coût ?", choix: [{ lettre: "A", texte: "2000 €", correct: false }, { lettre: "B", texte: "3000 €", correct: true }] },
];
const core = (o: Partial<CoreMatiereState> = {}): CoreMatiereState => ({
  attemptId: "att", examId: "EB1", matiereId: "gestion", finishedAt: "2026-11-06T18:44:46Z", qrcTotal: 1, qrcRestantes: 0,
  status: "definitif", pending: false, note20: 7, questions: moteur,
  answers: { "gestion:1": "Cpam", "gestion:2": ["B"] },
  qrcProofs: [{ questionId: "gestion:1", reponse: "Cpam", etat: "corrigee", note: 0 }], ...o,
} as any);
const row = (questions: any[], reponses: any = { 1: "Cpam", 2: ["B"] }) => ({ id: "r", quiz_type: "examen_blanc", quiz_id: "EB1", matiere_id: "gestion",
  completed_at: "2026-11-06T18:44:46.8Z", score_obtenu: 7.5, score_max: 20, details: { questions, reponses, qrc_pending_correction: true } });
const note = (r: any, c = core()) => noteExamenAffichee(attacherSourceUnique(r, [c], new Set()));

describe("EB : énoncé retouché après le passage, QRC corrigées, note serveur définitive", () => {
  it("affiche 7/20 du passage serveur, plus « En attente » (0/2 reste 0)", () => {
    expect(note(row(fiche))).toEqual({ etat: "note", note20: 7, source: "noyau", mention: null });
  });
  it("QRC encore à corriger : jamais de note inventée", () => {
    expect(note(row(fiche), core({ pending: true, note20: null, qrcRestantes: 1 })).etat).not.toBe("note");
  });
  it("bonne réponse QCM différente : ancien circuit conservé (règle stricte)", () => {
    const autre = [fiche[0], { ...fiche[1], choix: [{ lettre: "A", texte: "2000 €", correct: true }, { lettre: "B", texte: "3000 €", correct: true }] }];
    expect(attacherSourceUnique(row(autre), [core()], new Set()).__core).toBeNull();
  });
  it("réponse attendue QRC différente : ancien circuit conservé", () => {
    expect(attacherSourceUnique(row([{ ...fiche[0], reponseQRC: "Autre" }, fiche[1]]), [core()], new Set()).__core).toBeNull();
  });
  it("énoncé QRC différent : ancien circuit conservé (identité de question)", () => {
    expect(attacherSourceUnique(row([{ ...fiche[0], enonce: "Autre sujet" }, fiche[1]]), [core()], new Set()).__core).toBeNull();
  });
  it("réponses élève différentes : ancien circuit conservé", () => {
    expect(attacherSourceUnique(row(fiche, { 1: "Cpam", 2: ["A"] }), [core()], new Set()).__core).toBeNull();
  });
  it("matière sans QRC : énoncé retouché ne suffit pas, règle stricte inchangée", () => {
    const r = attacherSourceUnique(row([fiche[1]], { 2: ["B"] }), [core({ qrcTotal: 0, qrcProofs: [], questions: [moteur[1]], answers: { "gestion:2": ["B"] } })], new Set());
    expect(r.__core).toBeNull();
  });
});
