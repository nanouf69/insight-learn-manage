import { describe, it, expect } from "vitest";
import {
  getAttemptQrcQuestionIds,
  isMatiereQrcPendingForAttempt,
} from "@/components/cours-en-ligne/exam-helpers";

const validated = (pts = 2) => ({
  manuel: true,
  validatedByAdmin: true,
  correctedAt: "2026-09-18T11:00:00.000Z",
  pointsObtenus: pts,
  explication: "Correction manuelle par l'administrateur : 2/2 pts",
});

// Snapshot de la tentative : la QRC était Q5 au moment du passage
const detailsTentative = {
  correctionsIA: { 5: validated() },
  questions: [
    { questionId: 4, type: "QCM", enonce: "Q QCM" },
    { questionId: 5, type: "QRC", enonce: "Expliquez la TVA." },
  ],
};

describe("Identité stable des QRC d'une tentative déjà passée", () => {
  it("lit les QRC depuis le snapshot de la tentative", () => {
    const matiere = { id: "gestion", questions: [{ id: 1, type: "QRC", enonce: "Expliquez la TVA." }] };
    expect(getAttemptQrcQuestionIds(matiere, detailsTentative)).toEqual([5]);
  });

  it("reste « déjà corrigée » après renumérotation de la question dans Gestion (Q5 → Q6)", () => {
    const matiereApresRenumerotation = {
      id: "gestion",
      questions: [
        { id: 5, type: "QCM", enonce: "Nouvelle question ajoutée" },
        { id: 6, type: "QRC", enonce: "Expliquez la TVA." },
      ],
    };
    expect(isMatiereQrcPendingForAttempt(matiereApresRenumerotation, detailsTentative)).toBe(false);
  });

  it("reste « déjà corrigée » après ajout, déplacement ou suppression de questions", () => {
    const matiereModifiee = {
      id: "gestion",
      questions: [
        { id: 1, type: "QRC", enonce: "Autre QRC ajoutée après le passage" },
        { id: 2, type: "QCM", enonce: "QCM déplacé" },
      ],
    };
    expect(isMatiereQrcPendingForAttempt(matiereModifiee, detailsTentative)).toBe(false);
  });

  it("reste « déjà corrigée » après une conversion QRC → QCM dans Gestion", () => {
    const matiereConvertie = { id: "gestion", questions: [{ id: 5, type: "QCM", enonce: "Expliquez la TVA." }] };
    expect(isMatiereQrcPendingForAttempt(matiereConvertie, detailsTentative)).toBe(false);
  });

  it("reste « en attente » tant qu'une QRC du snapshot n'est pas validée", () => {
    const details = {
      correctionsIA: { 5: validated() },
      questions: [
        { questionId: 5, type: "QRC", enonce: "Expliquez la TVA." },
        { questionId: 9, type: "QRC", enonce: "Expliquez l'URSSAF." },
      ],
    };
    expect(isMatiereQrcPendingForAttempt({ id: "gestion", questions: [] }, details)).toBe(true);
  });

  it("retombe sur la définition actuelle quand la tentative n'a pas de snapshot", () => {
    const matiere = { id: "gestion", questions: [{ id: 1, type: "QRC", enonce: "Expliquez la TVA." }] };
    expect(isMatiereQrcPendingForAttempt(matiere, { correctionsIA: {} })).toBe(true);
    expect(isMatiereQrcPendingForAttempt(matiere, { correctionsIA: { 1: validated() } })).toBe(false);
  });

  it("ne mélange pas les matières d'une ligne bilan agrégée", () => {
    const details = {
      correctionsIA: { 3: validated() },
      questions: [
        { questionId: 3, type: "QRC", matiereId: "gestion", enonce: "QRC gestion" },
        { questionId: 7, type: "QRC", matiereId: "t3p", enonce: "QRC T3P" },
      ],
    };
    expect(isMatiereQrcPendingForAttempt({ id: "gestion", questions: [] }, details)).toBe(false);
    expect(isMatiereQrcPendingForAttempt({ id: "t3p", questions: [] }, details)).toBe(true);
  });
});
