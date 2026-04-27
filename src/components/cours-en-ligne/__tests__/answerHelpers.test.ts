// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getQuestionChoices, isAnswerCorrect } from "./answerHelpers";

describe("getQuestionChoices — robustesse face aux questions sans choix", () => {
  it("retourne [] si la question est null", () => {
    expect(getQuestionChoices(null)).toEqual([]);
  });

  it("retourne [] si la question est undefined", () => {
    expect(getQuestionChoices(undefined)).toEqual([]);
  });

  it("retourne [] si choix est manquant (QRC)", () => {
    expect(getQuestionChoices({} as any)).toEqual([]);
  });

  it("retourne [] si choix est null", () => {
    expect(getQuestionChoices({ choix: null } as any)).toEqual([]);
  });

  it("retourne [] si choix n'est pas un tableau (donnée corrompue)", () => {
    expect(getQuestionChoices({ choix: "abc" } as any)).toEqual([]);
    expect(getQuestionChoices({ choix: 42 } as any)).toEqual([]);
    expect(getQuestionChoices({ choix: {} } as any)).toEqual([]);
  });

  it("retourne le tableau quand il est valide", () => {
    const choix = [
      { lettre: "A", correct: true },
      { lettre: "B", correct: false },
    ];
    expect(getQuestionChoices({ choix })).toEqual(choix);
  });
});

describe("isAnswerCorrect — ne crash jamais sur questions sans choix", () => {
  it("ne crash pas et retourne false si question = null", () => {
    expect(() => isAnswerCorrect("A", null)).not.toThrow();
    expect(isAnswerCorrect("A", null)).toBe(false);
  });

  it("ne crash pas et retourne false si question = undefined", () => {
    expect(() => isAnswerCorrect(["A"], undefined)).not.toThrow();
    expect(isAnswerCorrect(["A"], undefined)).toBe(false);
  });

  it("ne crash pas si choix manquant (QRC)", () => {
    expect(() => isAnswerCorrect("A", {} as any)).not.toThrow();
    expect(isAnswerCorrect("A", {} as any)).toBe(false);
  });

  it("ne crash pas si choix corrompu (string)", () => {
    expect(() => isAnswerCorrect("A", { choix: "x" } as any)).not.toThrow();
    expect(isAnswerCorrect("A", { choix: "x" } as any)).toBe(false);
  });

  it("ne crash pas si choix = []", () => {
    expect(() => isAnswerCorrect("A", { choix: [] })).not.toThrow();
    expect(isAnswerCorrect("A", { choix: [] })).toBe(false);
  });

  it("ne crash pas si selected = undefined", () => {
    expect(() =>
      isAnswerCorrect(undefined, { choix: [{ lettre: "A", correct: true }] })
    ).not.toThrow();
    expect(
      isAnswerCorrect(undefined, { choix: [{ lettre: "A", correct: true }] })
    ).toBe(false);
  });

  it("ne crash pas si selected = [] vide", () => {
    expect(
      isAnswerCorrect([], { choix: [{ lettre: "A", correct: true }] })
    ).toBe(false);
  });

  it("ne crash pas si selected contient des entrées falsy", () => {
    expect(() =>
      isAnswerCorrect(
        ["", null as any, undefined as any],
        { choix: [{ lettre: "A", correct: true }] }
      )
    ).not.toThrow();
  });
});

describe("isAnswerCorrect — logique métier (mono / multi réponses)", () => {
  const qSimple = { choix: [
    { lettre: "A", correct: true },
    { lettre: "B", correct: false },
    { lettre: "C", correct: false },
  ]};

  const qMulti = { choix: [
    { lettre: "A", correct: true },
    { lettre: "B", correct: true },
    { lettre: "C", correct: false },
  ]};

  it("réponse mono correcte (string)", () => {
    expect(isAnswerCorrect("A", qSimple)).toBe(true);
  });

  it("réponse mono incorrecte", () => {
    expect(isAnswerCorrect("B", qSimple)).toBe(false);
  });

  it("réponse mono correcte (array d'un élément)", () => {
    expect(isAnswerCorrect(["A"], qSimple)).toBe(true);
  });

  it("réponse multi correcte (ordre indifférent)", () => {
    expect(isAnswerCorrect(["B", "A"], qMulti)).toBe(true);
    expect(isAnswerCorrect(["A", "B"], qMulti)).toBe(true);
  });

  it("réponse multi incomplète = incorrecte", () => {
    expect(isAnswerCorrect(["A"], qMulti)).toBe(false);
  });

  it("réponse multi en trop = incorrecte", () => {
    expect(isAnswerCorrect(["A", "B", "C"], qMulti)).toBe(false);
  });
});

describe("Scénario de régression — boucle de reset utilisateur AFAJDAR", () => {
  // Simule l'itération sur des réponses dont certaines questions ont été
  // supprimées ou corrompues en BDD (cas qui crashait avant le fix).
  it("itération massive sur questions hétérogènes ne crash pas", () => {
    const reponses: Array<{ key: string; selected: string | string[] }> = [
      { key: "ex1-q1", selected: "A" },
      { key: "ex1-q2", selected: ["A", "B"] },
      { key: "ex1-q3", selected: "" },
      { key: "ex2-q1", selected: ["X"] },
    ];

    const questions: Array<QuestionLike> = [
      { choix: [{ lettre: "A", correct: true }] },
      null,                              // question supprimée
      undefined,                         // donnée manquante
      { choix: undefined } as any,       // QRC
      { choix: "corrupted" } as any,     // donnée corrompue
      {} as any,                         // objet vide
    ];

    expect(() => {
      reponses.forEach((r) => {
        questions.forEach((q) => {
          isAnswerCorrect(r.selected, q);
          getQuestionChoices(q).map((c) => c.lettre);
        });
      });
    }).not.toThrow();
  });
});

// Type helper local pour les tests
type QuestionLike = { choix?: { lettre: string; correct?: boolean }[] } | null | undefined;
