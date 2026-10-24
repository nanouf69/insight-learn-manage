// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatDateFROrRaw } from "@/lib/safeDateParse";

describe("Dates de formation de la fiche apprenant", () => {
  it("affiche « mardi 3 novembre 2026 » au lieu de 2026-11-03", () => {
    expect(formatDateFROrRaw("2026-11-03")).toBe("mardi 3 novembre 2026");
  });

  it("affiche « mercredi 31 mars 2027 » au lieu de 2027-03-31", () => {
    expect(formatDateFROrRaw("2027-03-31")).toBe("mercredi 31 mars 2027");
  });

  it("conserve une valeur vide ou non datée sans l'inventer", () => {
    expect(formatDateFROrRaw("")).toBe("");
    expect(formatDateFROrRaw(null)).toBe("");
    expect(formatDateFROrRaw(undefined)).toBe("");
    expect(formatDateFROrRaw("Du 12 au 25 janvier 2026")).toBe("Du 12 au 25 janvier 2026");
    expect(formatDateFROrRaw("2026-13-45")).toBe("2026-13-45");
  });

  it("la fiche utilise le formatateur pour les deux dates", () => {
    const page = readFileSync("src/components/crm/ApprenantDetailPage.tsx", "utf8");
    expect(page).toContain("{formatDateFROrRaw(apprenant.date_debut_formation) || '-'}");
    expect(page).toContain("{formatDateFROrRaw(apprenant.date_fin_formation) || '-'}");
  });
});

import { readFileSync } from "node:fs";
