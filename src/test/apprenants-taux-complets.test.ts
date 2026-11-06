import { describe, expect, it } from "vitest";
import { apprenantsCompletsVisibles, estApprenantTauxComplet } from "@/lib/apprenantsTauxComplets";

describe("Tableau de bord des apprenants à 100 %", () => {
  it("retient 100 % de jalons même si le total est inférieur", () => {
    expect(estApprenantTauxComplet(100, 40)).toBe(true);
  });

  it("retient 100 % au total même si les jalons sont inférieurs", () => {
    expect(estApprenantTauxComplet(40, 100)).toBe(true);
  });

  it("ne duplique pas un apprenant qui remplit les deux critères", () => {
    const rows = [{ id: "a", complet: estApprenantTauxComplet(100, 100) }];
    expect(apprenantsCompletsVisibles(rows, [])).toHaveLength(1);
  });

  it("exclut les taux inférieurs et les lectures indisponibles", () => {
    expect(estApprenantTauxComplet(99, 99)).toBe(false);
    expect(estApprenantTauxComplet(null, null)).toBe(false);
  });

  it("inclut un total supérieur à 100 % sans inventer un plafond", () => {
    expect(estApprenantTauxComplet(20, 105)).toBe(true);
  });

  it("masque uniquement la personne retirée et permet sa réapparition", () => {
    const rows = [{ id: "a", complet: true }, { id: "b", complet: true }];
    expect(apprenantsCompletsVisibles(rows, ["a"]).map((row) => row.id)).toEqual(["b"]);
    expect(apprenantsCompletsVisibles(rows, []).map((row) => row.id)).toEqual(["a", "b"]);
    expect(rows).toHaveLength(2);
  });
});
