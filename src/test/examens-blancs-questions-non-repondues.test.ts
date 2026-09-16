// @vitest-environment node
import { describe, it, expect } from "vitest";
import { isReponseFournie, firstUnansweredIndex } from "@/components/cours-en-ligne/examens-blancs-utils";

const questions = [
  { id: 1, type: "QCM" },
  { id: 2, type: "QCM" },
  { id: 3, type: "QRC" },
  { id: 4, type: "QCM" },
  { id: 5, type: "QRC" },
  { id: 6, type: "QCM" },
  { id: 7, type: "QCM" },
  { id: 8, type: "QRC" },
];

describe("Examens blancs — blocage tant que toutes les questions ne sont pas répondues", () => {
  it("une QRC vide ou composée d'espaces compte comme non répondue", () => {
    expect(isReponseFournie("QRC", "")).toBe(false);
    expect(isReponseFournie("QRC", "   ")).toBe(false);
    expect(isReponseFournie("QRC", "ma réponse")).toBe(true);
  });

  it("un QCM sans case cochée compte comme non répondu", () => {
    expect(isReponseFournie("QCM", [])).toBe(false);
    expect(isReponseFournie("QCM", ["A"])).toBe(true);
  });

  it("scénario Q3 et Q8 vides : renvoie d'abord Q3, puis Q8, puis plus rien", () => {
    const reponses: Record<string, unknown> = {
      1: ["A"], 2: ["B"], 3: "", 4: ["C"], 5: "réponse 5", 6: ["A"], 7: ["D"], 8: "   ",
    };
    expect(firstUnansweredIndex(questions, reponses)).toBe(2); // Q3

    reponses[3] = "réponse 3";
    expect(firstUnansweredIndex(questions, reponses)).toBe(7); // Q8
    // Les réponses déjà saisies restent intactes
    expect(reponses[5]).toBe("réponse 5");

    reponses[8] = "réponse 8";
    expect(firstUnansweredIndex(questions, reponses)).toBe(-1); // validation possible
  });

  it("les clés texte (JSON) sont reconnues comme des réponses valides", () => {
    expect(firstUnansweredIndex([{ id: 12, type: "QRC" }], { "12": "ok" })).toBe(-1);
  });
});
