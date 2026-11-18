import { describe, it, expect } from "vitest";
import { applyQuestionSaveIntent, questionsNonConservees } from "@/lib/adminQuestionSaveIntent";

const q29 = (texteB: string) => ({ id: 29, enonce: "Coût de la carte professionnelle VTC :", choix: [
  { lettre: "A", texte: "36 €" }, { lettre: "B", texte: texteB, correct: true }, { lettre: "C", texte: "170 €" }] });
const mod = (texteB: string) => ({ exercices: [{ id: 106, questions: [q29(texteB)] }, { id: 101, questions: [{ id: 1, enonce: "Gestion", choix: [] }] }] });

describe("relecture obligatoire des questions admin", () => {
  const edited = new Set(["106-29"]);
  it("refuse le succès si la base a gardé l'ancienne valeur", () => {
    expect(questionsNonConservees(mod("60 € TTC"), mod("68 € TTC"), edited)).toEqual(["106-29"]);
  });
  it("accepte quand la base relue contient exactement la modification", () => {
    expect(questionsNonConservees(mod("60 € TTC"), mod("60 € TTC"), edited)).toEqual([]);
  });
  it("détecte une question disparue à la relecture", () => {
    expect(questionsNonConservees(mod("60 € TTC"), { exercices: [{ id: 106, questions: [] }] }, edited)).toEqual(["106-29"]);
  });
  it("détecte un changement de bonne réponse", () => {
    const relu = mod("60 € TTC"); (relu.exercices[0].questions[0] as any).choix[1].correct = false;
    expect(questionsNonConservees(mod("60 € TTC"), relu, edited)).toEqual(["106-29"]);
  });
  it("module FC sans ligne propre : sans lecture serveur, aucune écriture n'est envoyée", () => {
    expect(() => applyQuestionSaveIntent(mod("60 € TTC"), null, edited, new Set(), new Set())).toThrow();
  });
  it("écriture dans le parent : seule la question modifiée change, la Gestion du parent est intacte", () => {
    const fc = { exercices: [{ id: 106, questions: [q29("60 € TTC")] }] };
    const out = applyQuestionSaveIntent(fc, mod("68 € TTC"), edited, new Set(), new Set());
    expect(out.exercices[0].questions[0].choix[1]).toEqual({ lettre: "B", texte: "60 € TTC", correct: true });
  });
});
