import { describe, expect, it } from "vitest";
import { computeMoyenneExamen, computeResultatMatiereScore } from "@/components/cours-en-ligne/examens-blancs-scoring";
import type { CoreMatiereState } from "@/lib/coreExamPublication";

const CONFIG = [
  ["t3p", 3], ["gestion", 2], ["securite", 3], ["francais", 2],
  ["anglais", 1], ["reglementation_vtc", 3], ["reglementation_vtc2", 3],
] as const;

function examen(notes: Record<string, number>) {
  return {
    matieres: CONFIG.map(([id, coefficient]) => ({
      id, nom: id === "anglais" ? "E - Anglais" : `Matière ${id}`, coefficient,
      noteSur: 20, noteEliminatoire: id === "anglais" ? 4 : 6, questions: [],
    })),
  } as any;
}

function bilan(notes: Record<string, number>) {
  const exam = examen(notes);
  return computeMoyenneExamen(exam, (matiere) => {
    const note20 = notes[matiere.id];
    if (note20 == null) return null;
    const core: CoreMatiereState = {
      attemptId: `fictif-${matiere.id}`, examId: "EB1", matiereId: matiere.id,
      finishedAt: "2026-11-06T10:00:00Z", qrcTotal: 1, qrcRestantes: 0,
      status: "definitif", note20, pending: false,
    };
    return computeResultatMatiereScore(matiere, {
      reponses: { 1: "ancienne réponse" }, noteObtenue: 20, maxPoints: 20,
      correctionsIA: { 1: { pointsObtenus: 20, estCorrect: true } }, __core: core,
    } as any);
  });
}

function bilanSimple(notes: Record<string, number>) {
  const exam = { matieres: [
    { id: "a", nom: "A", coefficient: 3, noteSur: 20, noteEliminatoire: 6, questions: [] },
    { id: "b", nom: "B", coefficient: 1, noteSur: 20, noteEliminatoire: 6, questions: [] },
  ] } as any;
  return computeMoyenneExamen(exam, (m) => ({
    scoreObtenu: notes[m.id], scoreMax: 20, noteSur20: notes[m.id],
    admis: notes[m.id] >= 6, passee: true,
  }));
}

const BENNANI = { t3p: 16.5, gestion: 11, securite: 11, francais: 10, anglais: 8, reglementation_vtc: 7, reglementation_vtc2: 6 };
const MALKI = { t3p: 3.5, gestion: 11, securite: 8, francais: 13, anglais: 7, reglementation_vtc: 11, reglementation_vtc2: 11 };
const SELMI = { t3p: 1.5, gestion: 5, securite: 6, francais: 11, anglais: 7, reglementation_vtc: 6.5, reglementation_vtc2: 7 };

describe("Notes QRC officielles répercutées au score global", () => {
  it("BENNANI : 171,5 points pondérés / 17 = 10,1, admise sans éliminatoire après régularisations", () => {
    const result = bilan(BENNANI);
    expect(result.totalCoef).toBe(17);
    expect(result.moyenne).toBe(10.1);
    expect(result.eliminatoires).toEqual([]);
    expect(result.admisGlobal).toBe(true);
  });

  it("MALKI : moyenne 9,1 et T3P 3,5 éliminatoire, non admis", () => {
    const result = bilan(MALKI);
    expect(result.moyenne).toBe(9.1);
    expect(result.eliminatoires).toEqual(["Matière t3p"]);
    expect(result.admisGlobal).toBe(false);
  });

  it("SELMI : moyenne 6,0 et matières sous les seuils, non admis", () => {
    const result = bilan(SELMI);
    expect(result.moyenne).toBe(6);
    expect(result.admisGlobal).toBe(false);
  });

  it("les coefficients officiels comptent : notes 12 coeff. 3 et 8 coeff. 1 donnent 11/20", () => {
    expect(bilanSimple({ a: 12, b: 8 }).moyenne).toBe(11);
  });

  it("une révision officielle peut faire passer de non admis à admis", () => {
    expect(bilanSimple({ a: 8, b: 4 }).admisGlobal).toBe(false);
    expect(bilanSimple({ a: 12, b: 8 }).admisGlobal).toBe(true);
  });

  it("une révision officielle peut faire passer d'admis à non admis", () => {
    expect(bilanSimple({ a: 12, b: 8 }).admisGlobal).toBe(true);
    expect(bilanSimple({ a: 12, b: 4 }).admisGlobal).toBe(false);
  });

  it("une matière encore en attente empêche l'admission, sans inventer sa note", () => {
    const result = bilan({ t3p: 12 });
    expect(result.matieresPassees).toBe(1);
    expect(result.matieresTotal).toBe(7);
    expect(result.admisGlobal).toBe(false);
  });
});
