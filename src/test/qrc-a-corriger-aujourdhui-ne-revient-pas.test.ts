/** @vitest-environment node */
/**
 * Règles vérifiées :
 *  - une QRC validée sort définitivement de « À corriger aujourd'hui » ;
 *  - les lignes techniques jumelles d'un MÊME passage ne créent qu'une entrée ;
 *  - une VRAIE nouvelle tentative reste une QRC distincte à corriger, même si
 *    l'élève donne exactement la même réponse que la tentative précédente.
 * L'identité vient du passage/tentative réel, jamais du contenu de la réponse.
 * Aucun test n'écrit en base.
 */
import { describe, it, expect } from "vitest";
import { getSnapshotQrcQuestionIds, isSameQrcContent } from "@/components/cours-en-ligne/CorrectionQRCTab";

const base = {
  apprenantId: "A1",
  quizId: "EB2",
  matiereId: "t3p",
  tentative: 1,
  questionId: 1,
  reponseEleve: "Titulaire permis de conduire\nVisite médicale apte",
};

describe("Identité d'une QRC : passage réel d'abord", () => {
  it("deux écritures techniques du même passage = la même QRC", () => {
    expect(isSameQrcContent(base, { ...base })).toBe(true);
  });

  it("insensible aux espaces et à la casse à l'intérieur du même passage", () => {
    expect(isSameQrcContent(base, { ...base, reponseEleve: "  TITULAIRE PERMIS DE CONDUIRE   Visite médicale apte " })).toBe(true);
  });

  it("une nouvelle tentative avec EXACTEMENT la même réponse reste une QRC distincte", () => {
    expect(isSameQrcContent(base, { ...base, tentative: 2 })).toBe(false);
  });

  it("une nouvelle tentative avec une réponse différente reste évidemment distincte", () => {
    expect(isSameQrcContent(base, { ...base, tentative: 2, reponseEleve: "Autre réponse" })).toBe(false);
  });

  it("ne mélange jamais deux apprenants, examens, matières ou questions", () => {
    expect(isSameQrcContent(base, { ...base, apprenantId: "A2" })).toBe(false);
    expect(isSameQrcContent(base, { ...base, quizId: "EB3" })).toBe(false);
    expect(isSameQrcContent(base, { ...base, matiereId: "gestion" })).toBe(false);
    expect(isSameQrcContent(base, { ...base, questionId: 2 })).toBe(false);
  });

  it("une réponse vide ne rapproche jamais deux QRC entre elles", () => {
    expect(isSameQrcContent({ ...base, reponseEleve: "   " }, { ...base, reponseEleve: "" })).toBe(false);
  });

  it("les réponses sauvegardées ne réinjectent pas des questions hors snapshot du passage", () => {
    const ids = getSnapshotQrcQuestionIds([
      { questionId: 1, type: "QRC" },
      { questionId: 2, type: "QRC" },
      { questionId: 3, type: "QCM" },
    ]);
    expect(ids?.has(1)).toBe(true);
    expect(ids?.has(2)).toBe(true);
    expect(ids?.has(3)).toBe(false);
    expect(ids?.has(4)).toBe(false);
  });
});
