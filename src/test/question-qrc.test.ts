import { describe, it, expect } from "vitest";
import { isQuestionQrc, qrcReponsesAttendues } from "@/lib/questionQrc";

// Copie fidèle de la question 192 du module 13 (exercice 13100).
const q192 = { id: 192, type: "QRC", choix: [], enonce: "Qu'est-ce que l'honorabilité dans votre profession ?", reponseQRC: "Avoir le casier judiciaire B2 vierge" };

describe("détection QRC élève", () => {
  it("type QRC en majuscules sans reponsesAttendues = QRC avec zone de texte", () => {
    expect(isQuestionQrc(q192)).toBe(true);
    expect(qrcReponsesAttendues(q192)).toEqual(["Avoir le casier judiciaire B2 vierge"]);
  });
  it("ancien format qrc minuscule inchangé", () => {
    expect(isQuestionQrc({ type: "qrc", choix: [], reponsesAttendues: ["x"], reponseQRC: "y" })).toBe(true);
    expect(qrcReponsesAttendues({ reponsesAttendues: ["x"], reponseQRC: "y" })).toEqual(["x"]);
  });
  it("QCM avec choix reste QCM", () => {
    expect(isQuestionQrc({ choix: [{ lettre: "A" }], reponseQRC: "y" })).toBe(false);
  });
  it("QCM sans choix ni réponse attendue n'est pas transformé en QRC", () => {
    expect(isQuestionQrc({ type: "QCM", choix: [] })).toBe(false);
  });
});
