// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ALL_DATES_EXAMEN_THEORIQUE, ALL_DATES_EXAMEN_STEP5, trouverExamenTheorique, getProchaineDateExamenTheorique } from "@/lib/examDatesConfig";
import { alerteDateLimiteDisponible, joursAvantDateLimite } from "@/lib/dossierFormation";

// Midi à Paris le jour donné
const jour = (iso: string) => new Date(`${iso}T10:00:00Z`);

describe("Calendrier examens", () => {
  it("toutes les dates 2026 conservées", () => {
    const d = ALL_DATES_EXAMEN_THEORIQUE.map((e) => e.date);
    for (const x of ["27 janvier 2026", "31 mars 2026", "26 mai 2026", "21 juillet 2026", "29 septembre 2026", "17 novembre 2026"]) expect(d).toContain(x);
  });
  it("6 dates 2027 ajoutées avec leur date limite", () => {
    const e27 = ALL_DATES_EXAMEN_THEORIQUE.filter((e) => e.iso.startsWith("2027"));
    expect(e27.map((e) => [e.iso, e.dateLimite])).toEqual([
      ["2027-01-26", "2027-01-08"], ["2027-03-30", "2027-03-12"], ["2027-05-25", "2027-05-07"],
      ["2027-07-20", "2027-07-02"], ["2027-09-28", "2027-09-10"], ["2027-12-07", "2027-11-19"],
    ]);
  });
  it("dates limites 2026 publiées", () => {
    expect(trouverExamenTheorique("17 novembre 2026")?.dateLimite).toBe("2026-10-30");
    expect(trouverExamenTheorique("29 septembre 2026")?.dateLimite).toBe("2026-09-11");
    expect(trouverExamenTheorique("27 janvier 2026")?.dateLimite).toBeNull();
  });
  it("bascule 2026 → 2027", () => {
    expect(getProchaineDateExamenTheorique(new Date(2026, 10, 18))?.date).toBe("26 janvier 2027");
    expect(ALL_DATES_EXAMEN_STEP5.map((e) => e.label)).toContain("7 décembre 2027");
  });
  it("aucune date devinée", () => {
    expect(trouverExamenTheorique(null)).toBeNull();
    expect(trouverExamenTheorique("17 décembre 2027")).toBeNull();
    expect(trouverExamenTheorique("n'importe quoi")).toBeNull();
    expect(trouverExamenTheorique("17 novembre 2026 (après-midi)")?.iso).toBe("2026-11-17");
    expect(trouverExamenTheorique("2027-03-30")?.iso).toBe("2027-03-30");
  });
  it("copie serveur identique à la source commune", () => {
    const edge = readFileSync("supabase/functions/onboarding-invitation/index.ts", "utf8");
    for (const e of ALL_DATES_EXAMEN_THEORIQUE) {
      expect(edge).toContain(`date: "${e.date}", iso: "${e.iso}", dateLimite: ${e.dateLimite ? `"${e.dateLimite}"` : "null"}`);
    }
  });
});

describe("Alerte J-3", () => {
  const L = "2026-10-30";
  it("J-4 → aucun bouton", () => expect(alerteDateLimiteDisponible(L, "a_payer", jour("2026-10-26"))).toBe(false));
  it("J-3 → disponible", () => expect(alerteDateLimiteDisponible(L, "a_payer", jour("2026-10-27"))).toBe(true));
  it("J-2 → disponible", () => expect(alerteDateLimiteDisponible(L, null, jour("2026-10-28"))).toBe(true));
  it("J-1 → disponible", () => expect(alerteDateLimiteDisponible(L, null, jour("2026-10-29"))).toBe(true));
  it("après la date limite → plus de bouton", () => expect(alerteDateLimiteDisponible(L, null, jour("2026-10-31"))).toBe(false));
  it("inscription validée → aucun bouton", () => expect(alerteDateLimiteDisponible(L, "inscription_validee", jour("2026-10-28"))).toBe(false));
  it("pas de date limite → aucun bouton", () => expect(alerteDateLimiteDisponible(null, null, jour("2026-10-28"))).toBe(false));
  it("calcul en jours calendaires Paris", () => expect(joursAvantDateLimite(L, new Date("2026-10-26T23:30:00Z"))).toBe(3));
});
