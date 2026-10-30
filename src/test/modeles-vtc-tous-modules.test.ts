import { describe, it, expect } from "vitest";
import { DEFAULT_MODULES_BY_TYPE as creation } from "@/components/apprenants/ApprenantForm";
import { DEFAULT_MODULES_BY_TYPE as modification } from "@/components/apprenants/ApprenantEditForm";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";

const ids = (t: string) => (FORMATION_MODULES as any)[t].modules.map((m: any) => m.id).sort((a: number, b: number) => a - b);
const tri = (a: number[]) => [...a].sort((x, y) => x - y);

describe("Nouvelle inscription : tous les modules de la formation", () => {
  // Tout module ajouté à l'écran « Modules par formation » doit être ajouté aux fiches, sinon ce test échoue.
  for (const t of ["vtc", "vtc-e-presentiel", "vtc-e", "taxi", "taxi-e-presentiel", "taxi-e", "ta", "ta-e-presentiel", "ta-e"]) {
    it(`${t} : création et modification = écran`, () => {
      expect(tri(creation[t])).toEqual(ids(t));
      expect(tri(modification[t])).toEqual(ids(t));
    });
  }
  it("VTC : Sources juridiques 60, Fiches 70, Fin de formation 50 présents", () => {
    for (const t of ["vtc", "vtc-e-presentiel", "vtc-e"]) for (const id of [60, 70, 50]) expect(creation[t]).toContain(id);
  });
  it("VA : 63, 73, 53 présents", () => {
    for (const t of ["va", "va-e-presentiel", "va-e"]) for (const id of [63, 73, 53]) {
      expect(creation[t]).toContain(id);
      expect(modification[t]).toContain(id);
    }
  });
});
