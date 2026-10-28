// @vitest-environment node
import { describe, expect, it } from "vitest";
import { attacherSourceUnique, noteExamenAffichee } from "@/lib/noteExamenAffichee";
import type { CoreMatiereState } from "@/lib/coreExamPublication";

// Passage natif : 1 QRC + 1 QCM, corrigé et publié (cas Kevin EB5 Français, données fictives).
const questions = [
  { id: "1", ordre: 0, type: "QRC", enonce: "Pourquoi ?", reponseQRC: "Parce que." },
  { id: "2", ordre: 1, type: "QCM", enonce: "Choisir", choix: [{ lettre: "A", texte: "x", correct: true }, { lettre: "B", texte: "y" }] },
];
const tronquees = [{ id: "1", ordre: 0, type: "QRC", enonce: "Pourquoi ?" }, { id: "2", ordre: 1, type: "QCM", enonce: "Choisir" }];
const core = (o: Partial<CoreMatiereState> = {}): CoreMatiereState => ({
  attemptId: "att", examId: "EB5", matiereId: "francais", finishedAt: "2026-10-21T09:32:01Z", qrcTotal: 1, qrcRestantes: 0,
  status: "definitif", pending: false, note20: 11.5, questions,
  answers: { "francais:1": "ma réponse", "francais:2": ["A"] },
  qrcProofs: [{ questionId: "francais:1", reponse: "ma réponse", etat: "corrigee", note: 1 }], ...o,
} as any);
const row = (details: any) => ({ id: "r", quiz_type: "examen_blanc", quiz_id: "EB5", matiere_id: "francais", completed_at: "2026-10-21T09:32:02Z", score_obtenu: 4, score_max: 20, details });
const det = { questions: tronquees, reponses: { 1: "ma réponse", 2: ["A"] } };

describe("Fiche ancienne tronquée d'une matière à QRC corrigée par le serveur", () => {
  it("note définitive du passage serveur affichée, plus « en attente »", () => {
    expect(noteExamenAffichee(attacherSourceUnique(row(det), [core()], new Set()))).toMatchObject({ etat: "note", source: "noyau", note20: 11.5 });
  });
  it("passage encore en correction : jamais de note inventée", () => {
    const n = noteExamenAffichee(attacherSourceUnique(row(det), [core({ pending: true, note20: null, qrcRestantes: 1 })], new Set()));
    expect(n.etat === "note" && n.source === "noyau").toBe(false);
  });
  it("réponses différentes : ancien circuit conservé", () => {
    const r = attacherSourceUnique(row({ ...det, reponses: { 1: "autre", 2: ["A"] } }), [core()], new Set());
    expect(r.__core).toBeNull();
  });
  it("énoncé différent : ancien circuit conservé", () => {
    const r = attacherSourceUnique(row({ ...det, questions: [{ ...tronquees[0], enonce: "Autre" }, tronquees[1]] }), [core()], new Set());
    expect(r.__core).toBeNull();
  });
  it("matière sans QRC : la règle stricte des choix reste appliquée", () => {
    const qcm = [questions[1]];
    const r = attacherSourceUnique(row({ questions: [tronquees[1]], reponses: { 2: ["A"] } }), [core({ qrcTotal: 0, qrcProofs: [], questions: qcm, answers: { "francais:2": ["A"] } })], new Set());
    expect(r.__core).toBeNull();
  });
  it("passage moteur sans bonne réponse explicite : refusé", () => {
    const sans = [questions[0], { ...questions[1], choix: [{ lettre: "A", texte: "x" }, { lettre: "B", texte: "y" }] }];
    expect(attacherSourceUnique(row(det), [core({ questions: sans })], new Set()).__core).toBeNull();
  });
});
