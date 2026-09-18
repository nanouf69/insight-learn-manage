import { describe, it, expect } from "vitest";
import { isMatiereQrcPending } from "@/components/cours-en-ligne/exam-helpers";

const matiere = {
  id: "t3p",
  nom: "A - T3P",
  questions: [
    { id: 1, type: "QCM" },
    { id: 2, type: "QRC" },
    { id: 3, type: "QRC" },
  ],
};

const adminCorrection = (points: number) => ({
  pointsObtenus: points,
  manuel: true,
  validatedByAdmin: true,
  correctedAt: new Date().toISOString(),
  explication: "Correction manuelle par l'administrateur : 2/2",
});

const autoCorrection = {
  pointsObtenus: 1,
  explication: "Correction déterministe : 1/3 élément(s) attendu(s)",
};

describe("Publication de la note bloquée tant qu'une QRC n'est pas validée", () => {
  it("aucune QRC corrigée → en attente", () => {
    expect(isMatiereQrcPending(matiere, {})).toBe(true);
  });

  it("QRC notées automatiquement par mots-clés → toujours en attente", () => {
    expect(isMatiereQrcPending(matiere, { 2: autoCorrection, 3: autoCorrection })).toBe(true);
  });

  it("correction partielle → toujours en attente", () => {
    expect(isMatiereQrcPending(matiere, { 2: adminCorrection(2) })).toBe(true);
  });

  it("toutes les QRC validées → note publiable", () => {
    expect(isMatiereQrcPending(matiere, { 2: adminCorrection(2), 3: adminCorrection(0) })).toBe(false);
  });

  it("matière sans QRC → jamais bloquée", () => {
    expect(isMatiereQrcPending({ id: "anglais", questions: [{ id: 1, type: "QCM" }] }, {})).toBe(false);
  });

  it("clés au format Q<id> reconnues", () => {
    expect(isMatiereQrcPending(matiere, { Q2: adminCorrection(2), Q3: adminCorrection(1) })).toBe(false);
  });
});
