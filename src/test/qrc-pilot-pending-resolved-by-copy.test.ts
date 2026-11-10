import { describe, it, expect } from "vitest";
import { engineMatierePending } from "@/hooks/useQrcEnginePending";
import { buildQrcAttemptId } from "@/lib/qrcInstances";

const A = "learner-1";
const att = buildQrcAttemptId(A, "EB2", "t3p", 1);
const entry = () => ({
  pendingByMatiere: new Set(["t3p"]),
  pendingTotal: 2,
  pendingAttemptIds: new Set([att]),
  pendingQuestionsByAttempt: new Map([[att, new Set(["1", "2"])]]),
});
const valid = { validatedByAdmin: true, manuel: true, correctedAt: "2026-11-09T18:48:03Z", pointsObtenus: 2 };

describe("fiche pilote QRC en attente vs copie notée par l'admin", () => {
  it("toutes les QRC en attente validées sur la copie : matière non bloquée", () => {
    expect(engineMatierePending(entry(), A, "EB2", "t3p", { tentative: 1, details: { correctionsIA: { 1: valid, 2: valid } } })).toBe(false);
  });
  it("une seule QRC encore non validée : reste en attente", () => {
    expect(engineMatierePending(entry(), A, "EB2", "t3p", { tentative: 1, details: { correctionsIA: { 1: valid } } })).toBe(true);
  });
  it("proposition IA non validée ne débloque jamais", () => {
    const ia = { estCorrect: true, pointsObtenus: 2, explication: "Correction déterministe" };
    expect(engineMatierePending(entry(), A, "EB2", "t3p", { tentative: 1, details: { correctionsIA: { 1: ia, 2: ia } } })).toBe(true);
  });
  it("autre tentative : corrections d'une autre copie ignorées", () => {
    expect(engineMatierePending(entry(), A, "EB2", "t3p", { tentative: 2, details: { correctionsIA: {} } })).toBe(false);
    expect(engineMatierePending(entry(), A, "EB2", "t3p", { tentative: 1, details: { correctionsIA: {} } })).toBe(true);
  });
  it("sans numéro de tentative : comportement prudent inchangé", () => {
    expect(engineMatierePending(entry(), A, "EB2", "t3p", { details: { correctionsIA: { 1: valid, 2: valid } } })).toBe(true);
  });
});
