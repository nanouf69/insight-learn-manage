import { describe, it, expect } from "vitest";
import { progressionModulesEleve } from "@/lib/progressionModulesEleve";
import { IDS_JEUX_LYON } from "@/lib/jeuxPedagogiques";

// Données fictives uniquement.
const mods = [{ id: 1, nom: "Introduction" }, { id: 2, nom: "Réglementation" }, { id: 8, nom: "PRATIQUE VTC" }];
const ok = (p: any) => { expect(p.etat).toBe("ok"); return p; };
describe("progression modules élève", () => {
  it("0 module terminé", () => { const p = ok(progressionModulesEleve(mods, () => false, new Set())); expect([p.termines, p.total, p.restants.length]).toEqual([0, 3, 3]); });
  it("tout completed + jeux faits = tous terminés", () => { const p = ok(progressionModulesEleve(mods, () => true, new Set(IDS_JEUX_LYON))); expect(p.termines).toBe(3); expect(p.restants).toEqual([]); });
  it("completed avant les jeux, jeux à faire = pas 100 %", () => {
    const p = ok(progressionModulesEleve(mods, () => true, new Set([IDS_JEUX_LYON[0]])));
    expect(p.termines).toBe(2); expect(p.restants[0]).toMatchObject({ id: 8, raison: "nouvelles_activites" }); expect(p.seulementPratique).toBe(true);
  });
  it("seul le serveur compte (progress 100 sans completed = non terminé)", () => { const p = ok(progressionModulesEleve(mods, (id) => id === 1, new Set(IDS_JEUX_LYON))); expect(p.termines).toBe(1); });
  it("TAXI sans module 8 : aucun jeu requis, lecture des jeux sans effet", () => { const p = ok(progressionModulesEleve([{ id: 1, nom: "A" }, { id: 2, nom: "B" }], () => true, null)); expect(p.termines).toBe(2); });
  it("lecture des jeux impossible avec module 8 => indisponible, jamais 0", () => { expect(progressionModulesEleve(mods, () => true, null).etat).toBe("indisponible"); });
  it("doublon d'identifiant compté une fois", () => { const p = ok(progressionModulesEleve([...mods, { id: 2, nom: "Réglementation" }], () => false, new Set())); expect(p.total).toBe(3); });
  it("jeux ne comptent pas comme modules", () => { const p = ok(progressionModulesEleve(mods, () => false, new Set(IDS_JEUX_LYON))); expect(p.total).toBe(3); });
});
