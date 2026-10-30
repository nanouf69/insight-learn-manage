import { describe, it, expect } from "vitest";
import { DEFAULT_MODULES_BY_TYPE as creation } from "@/components/apprenants/ApprenantForm";
import { DEFAULT_MODULES_BY_TYPE as modification } from "@/components/apprenants/ApprenantEditForm";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";

const attendus: Record<string, number[]> = {
  taxi: [61, 71, 51], "taxi-e-presentiel": [61, 71, 51], "taxi-e": [61, 71, 51],
  ta: [62, 72, 52], "ta-e-presentiel": [62, 72, 52], "ta-e": [62, 72, 52],
};

describe("Modèles TAXI/TA : sources, fiches, fin de formation", () => {
  for (const [nom, defaults] of [["création", creation], ["modification", modification]] as const) {
    for (const [type, ids] of Object.entries(attendus)) {
      it(`${nom} ${type} contient ${ids.join("/")} une seule fois`, () => {
        for (const id of ids) expect(defaults[type].filter(x => x === id)).toEqual([id]);
        expect(new Set(defaults[type]).size).toBe(defaults[type].length);
      });
    }
  }
  it("tailles : présentiel 15, e-learning 14", () => {
    for (const t of ["taxi", "taxi-e-presentiel", "ta", "ta-e-presentiel"]) expect(creation[t].length).toBe(15);
    for (const t of ["taxi-e", "ta-e"]) expect(creation[t].length).toBe(14);
  });
  it("création = écran Modules par formation (mêmes modules)", () => {
    for (const t of Object.keys(attendus)) {
      const ecran = (FORMATION_MODULES as any)[t].modules.map((m: any) => m.id).sort((a: number, b: number) => a - b);
      expect([...creation[t]].sort((a, b) => a - b)).toEqual(ecran);
    }
  });
});
