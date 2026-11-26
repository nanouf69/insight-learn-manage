import { describe, expect, it } from "vitest";
import { apprenantsRattachesFacture } from "@/lib/comptabilite/rattachementsFacture";

describe("Rattachements additionnels des factures", () => {
  it("conserve l’apprenant initial et ajoute deux autres apprenants", () => {
    const f = { apprenant_id: "initial", rattachements: [
      { apprenant_id: "deux", nom_apprenant: "Second" },
      { apprenant_id: "trois", nom_apprenant: "Troisième" },
    ] };
    const avant = JSON.stringify(f);
    expect(apprenantsRattachesFacture(f).map(l => l.apprenant_id)).toEqual(["initial", "deux", "trois"]);
    expect(JSON.stringify(f)).toBe(avant);
  });
  it("ne compte pas deux fois un apprenant déjà rattaché", () => {
    expect(apprenantsRattachesFacture({ apprenant_id: "initial", rattachements: [
      { apprenant_id: "initial", nom_apprenant: "Autre trace conservée" },
    ] })).toHaveLength(1);
  });
  it("préserve les lignes facturées de la facture commune et leur montant", () => {
    const f = { lignes_apprenants: [
      { apprenant_id: "a", stagiaire: "Premier", designation: "FC TAXI", montant_ht: 200 },
      { apprenant_id: "b", stagiaire: "Deuxième", designation: "FC TAXI", montant_ht: 200 },
    ], rattachements: [{ apprenant_id: "c", nom_apprenant: "Troisième" }] };
    const avant = JSON.stringify(f.lignes_apprenants);
    expect(apprenantsRattachesFacture(f).map(l => l.apprenant_id)).toEqual(["a", "b", "c"]);
    expect(JSON.stringify(f.lignes_apprenants)).toBe(avant);
  });
});