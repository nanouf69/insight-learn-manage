import { describe, expect, it } from "vitest";
import { isCoursAgenda } from "../components/agenda/isCoursAgenda";

describe("Agenda : cours enregistrés visibles", () => {
  it.each([
    ["module-11", "6.BILAN EXAMEN TAXI", "Formation TAXI et TA (TAXI/TA)"],
    ["2", "Bilan QCM Examen", "Formation VTC (VTC)"],
    ["3", "Bilan QRC Examen", "Formation TAXI et VTC"],
    ["42", "Correction bilan examen TAXI/TA", "Formation TAXI et TA"],
    ["6", "Examen blanc 1", "Formation VTC (VTC)"],
    ["module-90", "Formation continue VTC", "Formation Continue VTC (FC VTC)"],
    ["module-91", "Formation continue TAXI", "Formation Continue TAXI (FC TAXI)"],
  ])("conserve le cours %s / %s", (discipline_id, discipline_nom, formation) => {
    expect(isCoursAgenda({ discipline_id, discipline_nom, formation })).toBe(true);
  });

  it("exclut un rendez-vous individuel par son identifiant", () => {
    expect(isCoursAgenda({ discipline_id: "exam-pratique", discipline_nom: "Examen candidat", formation: "CMA" })).toBe(false);
  });

  it.each(["Examen pratique CMA", "Examen théorique CMA"])("exclut %s même sans identifiant", (formation) => {
    expect(isCoursAgenda({ formation })).toBe(false);
  });
});