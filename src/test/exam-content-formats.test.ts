// @vitest-environment node
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/exam-content-legacy-snapshot.json";
import { verifierContenuPassage } from "@/lib/passagesV2NonFiables";
import type { CoreMatiereState } from "@/lib/coreExamPublication";
import { attacherSourceUnique, noteExamenAffichee } from "@/lib/noteExamenAffichee";
const core = { attemptId: "att", examId: "EB5", matiereId: "anglais", finishedAt: "2026-09-27T13:28:27Z", qrcTotal: 0, qrcRestantes: 0, status: "definitif", pending: false, note20: 13, questions: fixture.coreQuestions } satisfies CoreMatiereState;
describe("Formats archivés réels, sans données personnelles", () => {
  it("details.questions sans choix n'est jamais une preuve de mêmes choix", () => {
    expect(fixture.legacyQuestions[0]).not.toHaveProperty("choix");
    expect(verifierContenuPassage(core, { questions: fixture.legacyQuestions })).toBe(false);
  });
  it("snapshot complet prioritaire : correct:false omis et ordre 0/1 compatibles", () => {
    expect(verifierContenuPassage(core, { questions: fixture.legacyQuestions, snapshot: fixture.snapshot })).toBe(true);
  });
  it("clé JSON réordonnée compatible, choix déplacé ou bonne réponse divergente refusés", () => {
    const qs: any[] = structuredClone(fixture.coreQuestions);
    qs[0].choix = qs[0].choix.map((c: any) => ({ texte: c.texte, lettre: c.lettre, ...("correct" in c ? { correct: c.correct } : {}) }));
    expect(verifierContenuPassage({ ...core, questions: qs }, { snapshot: fixture.snapshot })).toBe(true);
    qs[0].choix.reverse();
    expect(verifierContenuPassage({ ...core, questions: qs }, { snapshot: fixture.snapshot })).toBe(false);
    const bad: any[] = structuredClone(fixture.coreQuestions);
    bad[0].choix.forEach((c: any) => { if ("correct" in c) c.correct = false; });
    expect(verifierContenuPassage({ ...core, questions: bad }, { snapshot: fixture.snapshot })).toBe(false);
  });
  it("ordre relatif, type, énoncé, image et identités dupliquées restent protégés", () => {
    const mutations = [
      (qs: any[]) => qs[0].ordre = 3,
      (qs: any[]) => qs[0].type = "QRC",
      (qs: any[]) => qs[0].enonce += " autre",
      (qs: any[]) => qs[0].image = "autre.png",
      (qs: any[]) => qs[0].id = qs[1].id,
    ];
    for (const mutate of mutations) {
      const questions = structuredClone(fixture.coreQuestions); mutate(questions);
      expect(verifierContenuPassage({ ...core, questions }, { snapshot: fixture.snapshot })).toBe(false);
    }
  });
  it("contenu non vérifiable ne masque pas une ancienne note déjà validée", () => {
    const row = { id: "r", quiz_type: "examen_blanc", quiz_id: "EB5", matiere_id: "anglais", completed_at: "2026-09-27T13:28:28Z", score_obtenu: 13, score_max: 20, details: { questions: fixture.legacyQuestions, reponses: { 1: ["C"], 2: ["C"] } } };
    const state = { ...core, answers: { "anglais:1": ["C"], "anglais:2": ["C"] } };
    expect(noteExamenAffichee(attacherSourceUnique(row, [state], new Set()))).toMatchObject({ etat: "note", source: "ancien", note20: 13 });
  });
});