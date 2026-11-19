// @vitest-environment node
import { describe, expect, it } from "vitest";
import { projectT3pLocalPresentation } from "@/lib/t3pLocalPresentation";

const fixture = () => [
  { id: 1, actif: true, questions: [1, 59, 72, 75].map(id => ({ id, enonce: `P1 ${id}`, choix: [{ lettre: "A", correct: true }], image: `image-${id}` })) },
  { id: 2, actif: true, questions: [59, 72, 73, 74, 75, 76, 81, 82].map(id => ({ id, enonce: `P2 ${id}`, choix: [{ lettre: "B", correct: true }], image: `image-${id}` })) },
  { id: 60, actif: true, questions: [{ id: 59, enonce: "Autre matière", choix: [], image: "other" }] },
];
describe.each([2, 10])("T3P local module %i", moduleId => {
  it.each([73, 74, 76])("affiche P2 Q%i en P1 avec l’identité originale", id => {
    const view = projectT3pLocalPresentation(moduleId, "cours-et-exercices", fixture());
    const entry = view?.parts[1].find(e => e.answerKey === `2-${id}`);
    expect(entry?.originalExerciseId).toBe(2);
    expect(entry?.identity).toBe(`module_${moduleId}_exo_2/question_${id}`);
    expect(view?.parts[2].some(e => e.answerKey === `2-${id}`)).toBe(false);
  });
  it("distingue P1 Q59 déplacée de P2 Q59 native", () => {
    const view = projectT3pLocalPresentation(moduleId, "cours-et-exercices", fixture());
    const entries = view?.parts[2].filter(e => e.question.id === 59);
    expect(entries?.map(e => e.answerKey)).toEqual(["1-59", "2-59"]);
    expect(entries?.map(e => e.label)).toEqual(["T3P P1 · Q59", "T3P P2 · Q59"]);
    expect(view?.parts[1].some(e => e.answerKey === "1-59")).toBe(false);
  });
  it("laisse Q72 et Q75 dans leur partie originale", () => {
    const view = projectT3pLocalPresentation(moduleId, "cours-et-exercices", fixture());
    expect(view?.parts[1].filter(e => [72, 75].includes(Number(e.question.id))).map(e => e.answerKey)).toEqual(["1-72", "1-75"]);
    expect(view?.parts[2].filter(e => [72, 75].includes(Number(e.question.id))).map(e => e.answerKey)).toEqual(["2-72", "2-75"]);
  });
  it("ne perd ni ne duplique aucun objet, image, choix ou autre exercice", () => {
    const source = fixture();
    const before = JSON.stringify(source);
    const view = projectT3pLocalPresentation(moduleId, "cours-et-exercices", source);
    if (!view) throw Error("Projection absente");
    expect(view.originalExercises).toBe(source);
    const displayed = [...view.parts[1], ...view.parts[2]];
    expect(displayed).toHaveLength(12);
    expect(new Set(displayed.map(e => e.identity)).size).toBe(12);
    displayed.forEach(e => expect(e.question).toBe(source.find(x => x.id === e.originalExerciseId)?.questions[e.originalIndex]));
    expect(JSON.stringify(source)).toBe(before);
    expect(view.originalExercises[2]).toBe(source[2]);
  });
  it("reprend et sauvegarde les réponses fictives sous les clés originales et remet les lots originaux", () => {
    const source = fixture();
    const view = projectT3pLocalPresentation(moduleId, "cours-et-exercices", source);
    if (!view) throw Error("Projection absente");
    const answers: Record<string, string[]> = { "1-59": ["A"], "2-59": ["B"], "2-73": ["A"] };
    expect(view.parts[2].filter(e => e.question.id === 59).map(e => answers[e.answerKey])).toEqual([["A"], ["B"]]);
    const moved = view.parts[1].find(e => e.answerKey === "2-73");
    if (!moved) throw Error("Q73 absente");
    answers[moved.answerKey] = ["B"];
    const reloaded = JSON.parse(JSON.stringify(answers));
    const submissions = view.originalExercises.slice(0, 2).map(exercise => ({
      exerciceId: `module_${moduleId}_exo_${exercise.id}`,
      totalQuestions: exercise.questions.length,
      reponses: Object.fromEntries(Object.entries(reloaded).filter(([key]) => key.startsWith(`${exercise.id}-`))),
    }));
    expect(submissions[0]).toEqual({ exerciceId: `module_${moduleId}_exo_1`, totalQuestions: 4, reponses: { "1-59": ["A"] } });
    expect(submissions[1]).toEqual({ exerciceId: `module_${moduleId}_exo_2`, totalQuestions: 8, reponses: { "2-59": ["B"], "2-73": ["B"] } });
  });
});
it("ne projette aucun bilan, examen, autre module ou quiz indépendant", () => {
  for (const id of [5, 11, 13, 25, 32, 35, 39]) expect(projectT3pLocalPresentation(id, "cours-et-exercices", fixture())).toBeNull();
  for (const id of [2, 10]) expect(projectT3pLocalPresentation(id, "other", fixture())).toBeNull();
});
it("refuse les sources partielles et les collisions sans déduplication", () => {
  const source = fixture();
  source[1].questions.push(source[1].questions[0]);
  expect(projectT3pLocalPresentation(2, "cours-et-exercices", source)).toBeNull();
  expect(source[1].questions).toHaveLength(9);
  const incomplete = fixture();
  incomplete[1].questions = incomplete[1].questions.filter(q => q.id !== 74);
  expect(projectT3pLocalPresentation(10, "cours-et-exercices", incomplete)).toBeNull();
});