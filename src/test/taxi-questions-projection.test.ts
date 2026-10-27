import { describe, it, expect } from "vitest";
import { projeterQuestionsTaxi } from "@/lib/taxiQuestionsProjection";

const q = (e: number, n: number) => ({ exerciceId: e, questionId: n });
const ex71 = Array.from({ length: 60 }, (_, i) => q(71, i + 1));
const ex74 = Array.from({ length: 25 }, (_, i) => q(74, i + 1));
const ex76 = Array.from({ length: 30 }, (_, i) => q(76, i + 1));
const toutes = [...ex71, ...ex74, ...ex76];
const jamais = () => false;
const deja = () => true;

describe("projection questions TAXI/TA (préparation)", () => {
  it("nouveau candidat : 12 doublons N2 non ré-affichés", () => {
    expect(projeterQuestionsTaxi({ moduleId: 10, exerciceId: 71, questions: ex71, aDejaRepondu: jamais }, toutes)).toHaveLength(48);
  });
  it("candidat ayant déjà répondu : affichage et exigences inchangés", () => {
    expect(projeterQuestionsTaxi({ moduleId: 40, exerciceId: 71, questions: ex71, aDejaRepondu: deja }, toutes)).toHaveLength(60);
    expect(projeterQuestionsTaxi({ moduleId: 24, exerciceId: 74, questions: ex74, aDejaRepondu: deja }, toutes)).toHaveLength(25);
  });
  it("Série 2 18-27 affichées en Locale 2 avec leur identité d'origine, sans doublon", () => {
    const l2 = projeterQuestionsTaxi({ moduleId: 42, exerciceId: 74, questions: ex74, aDejaRepondu: jamais }, toutes);
    const s2 = projeterQuestionsTaxi({ moduleId: 42, exerciceId: 76, questions: ex76, aDejaRepondu: jamais }, toutes);
    expect(l2).toHaveLength(35);
    expect(l2.filter((x) => x.exerciceId === 76).map((x) => x.questionId)).toEqual([18, 19, 20, 21, 22, 23, 24, 25, 26, 27]);
    expect(s2).toHaveLength(20);
    expect(l2.length + s2.length).toBe(ex74.length + ex76.length);
  });
  it("VTC/VA jamais touchés", () => {
    expect(projeterQuestionsTaxi({ moduleId: 2, exerciceId: 71, questions: ex71, aDejaRepondu: jamais }, toutes)).toBe(ex71);
  });
});
