// @vitest-environment node
import { describe, it, expect } from "vitest";
import { prochaineSessionApres } from "@/lib/decalageExamenTheorique";
import { ALL_DATES_EXAMEN_THEORIQUE } from "@/lib/examDatesConfig";

describe("Décalage au prochain examen théorique — calendrier officiel", () => {
  it("21 juillet 2026 → 29 septembre 2026", () => {
    expect(prochaineSessionApres("21 juillet 2026")?.date).toBe("29 septembre 2026");
  });
  it("passage d'année : 17 novembre 2026 → 26 janvier 2027 avec sa date limite", () => {
    const p = prochaineSessionApres("17 novembre 2026");
    expect(p?.date).toBe("26 janvier 2027");
    expect(p?.dateLimite).toBe("2027-01-08");
  });
  it("dernière date connue ou date inconnue : aucune proposition inventée", () => {
    const derniere = ALL_DATES_EXAMEN_THEORIQUE[ALL_DATES_EXAMEN_THEORIQUE.length - 1].date;
    expect(prochaineSessionApres(derniere)).toBeNull();
    expect(prochaineSessionApres("pas_encore_choisi")).toBeNull();
    expect(prochaineSessionApres(null)).toBeNull();
  });
});
