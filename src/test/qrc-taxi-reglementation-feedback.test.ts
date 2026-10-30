import { describe, expect, it } from "vitest";
import { quizItems } from "@/data/quiz-qrc-taxi/quizData";
import { alerteReglementaireQrc } from "@/components/cours-en-ligne/QuizQrcTaxiIntegre";

describe("périmètre réglementaire sans changement de barème", () => {
  it("seuls les trois énoncés ciblés sont marqués pour arbitrage", () => {
    expect(quizItems.filter((q) => alerteReglementaireQrc(q) !== null).map((q) => q.id)).toEqual([25, 26, 33]);
  });
  it("un identifiant seul ne permet pas d'appliquer une alerte à une autre question", () => {
    const q = quizItems.find((item) => item.id === 33);
    if (!q) throw new Error("Question équipements absente");
    expect(alerteReglementaireQrc({ ...q, qrcQuestion: "Une autre question" })).toBeNull();
  });
  it("ajouter le feedback ne mute aucune référence de correction", () => {
    const avant = JSON.stringify(quizItems);
    quizItems.forEach(alerteReglementaireQrc);
    expect(JSON.stringify(quizItems)).toBe(avant);
  });
});