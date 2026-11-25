import { describe, it, expect } from "vitest";
import { bornesPeriode, formationChevauche } from "./preuvesPeriode";
describe("preuvesPeriode", () => {
  it("mois de février 2028 bissextile", () => expect(bornesPeriode("mois", "2028-02")).toEqual({ debut: "2028-02-01", fin: "2028-02-29" }));
  it("année", () => expect(bornesPeriode("annee", "2026")).toEqual({ debut: "2026-01-01", fin: "2026-12-31" }));
  it("formation chevauchant le jour", () => expect(formationChevauche("2026-11-20", "2026-11-30", bornesPeriode("jour", "2026-11-25"))).toBe(true));
  it("formation hors période", () => expect(formationChevauche("2026-10-01", "2026-10-31", bornesPeriode("mois", "2026-11"))).toBe(false));
  it("sans date de début exclue", () => expect(formationChevauche(null, "2026-11-30", bornesPeriode("annee", "2026"))).toBe(false));
});
