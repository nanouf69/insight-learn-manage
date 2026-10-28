import { describe, it, expect } from "vitest";
import { qrcACorriger, etatCorrectionQrc, pointsAvecQrc, resultatIaValide, echecRetentable } from "@/lib/qrcCorrectionFinale";

const qs = [
  { id: 1, type: "qcm", choix: [{ lettre: "A", correct: true }] },
  { id: 2, type: "qrc" },
  { id: 3, type: "qrc" },
];
const sel = { "5-1": "A" };

describe("correction QRC à la validation finale", () => {
  it("corrige seulement les QRC répondues et pas encore corrigées (une fois par question)", () => {
    expect(qrcACorriger(5, qs, { "5-2": "réponse", "5-3": "" }, sel, {})).toEqual(["5-2"]);
    expect(qrcACorriger(5, qs, { "5-2": "réponse" }, sel, { "5-2": "loading" })).toEqual([]);
  });
  it("aucune note définitive tant qu'une correction est en cours ou en échec", () => {
    const a = { "5-2": "x", "5-3": "y" };
    expect(etatCorrectionQrc(5, qs, a, sel, { "5-2": "loading" })).toBe("en_cours");
    expect(etatCorrectionQrc(5, qs, a, sel, { "5-2": { estCorrect: true, pointsObtenus: 2, explication: "" }, "5-3": { indisponible: true } })).toBe("echec");
    expect(etatCorrectionQrc(5, qs, a, sel, { "5-2": { estCorrect: true, pointsObtenus: 2, explication: "" }, "5-3": { estCorrect: false, pointsObtenus: 0, explication: "" } })).toBe("terminee");
    expect(etatCorrectionQrc(5, qs, {}, sel, {})).toBe("aucune");
  });
  it("note globale = QCM justes + QRC jugées correctes", () => {
    const r = { "5-2": { estCorrect: true, pointsObtenus: 2, explication: "" }, "5-3": { estCorrect: false, pointsObtenus: 1, explication: "" } };
    expect(pointsAvecQrc(5, qs, r, (q) => q.id === 1)).toBe(2);
  });
  it("échec technique jamais transformé en note ; seuls 429/5xx/réseau retentés", () => {
    expect(resultatIaValide({ error: "x" })).toBe(false);
    expect(resultatIaValide({ estCorrect: false, pointsObtenus: 0 })).toBe(true);
    expect(echecRetentable(429)).toBe(true);
    expect(echecRetentable(503)).toBe(true);
    expect(echecRetentable(undefined)).toBe(true);
    expect(echecRetentable(402)).toBe(false);
    expect(echecRetentable(400)).toBe(false);
  });
});
