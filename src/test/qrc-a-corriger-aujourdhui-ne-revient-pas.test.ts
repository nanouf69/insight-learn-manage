/** @vitest-environment node */
/**
 * Règle : une QRC validée aujourd'hui sort définitivement de
 * « À corriger aujourd'hui » et n'apparaît qu'une seule fois dans
 * « Déjà corrigées », même quand le passage a été écrit sur plusieurs
 * lignes techniques. Une vraie nouvelle tentative (réponse différente)
 * reste une QRC à corriger. Aucune donnée n'est écrite par ces tests.
 */
import { describe, it, expect } from "vitest";
import { isSameQrcContent } from "@/components/cours-en-ligne/CorrectionQRCTab";

const base = {
  apprenantId: "A1",
  quizId: "EB2",
  matiereId: "t3p",
  questionId: 1,
  reponseEleve: "Titulaire permis de conduire\nVisite médicale apte",
};

describe("Identité de contenu d'une QRC", () => {
  it("deux écritures techniques du même passage = la même QRC", () => {
    expect(isSameQrcContent(base, { ...base })).toBe(true);
  });

  it("insensible aux espaces et à la casse de la même réponse", () => {
    expect(isSameQrcContent(base, { ...base, reponseEleve: "  TITULAIRE PERMIS DE CONDUIRE   Visite médicale apte " })).toBe(true);
  });

  it("une réponse réellement différente (nouvelle tentative) reste distincte", () => {
    expect(isSameQrcContent(base, { ...base, reponseEleve: "Autre réponse donnée au second passage" })).toBe(false);
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
});
