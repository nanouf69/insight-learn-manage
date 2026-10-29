import { describe, it, expect } from "vitest";
import { DEFAULT_MODULES_BY_TYPE as creation } from "@/components/apprenants/ApprenantForm";
import { DEFAULT_MODULES_BY_TYPE as modification } from "@/components/apprenants/ApprenantEditForm";
import { modulesAttribuesDashboard } from "@/lib/parcoursModulesDashboard";

describe("Cas pratique TAXI : attribution des formulaires", () => {
  for (const [nom, defaults] of [["création", creation], ["modification", modification]] as const) {
    for (const type of ["taxi", "taxi-e", "taxi-e-presentiel", "ta", "ta-e", "ta-e-presentiel"]) {
      it(`${nom} ${type} inclut une seule fois le module 12`, () => {
        expect(defaults[type].filter(id => id === 12)).toHaveLength(1);
      });
    }
    for (const type of ["vtc", "vtc-e", "vtc-e-presentiel", "va", "va-e", "va-e-presentiel"]) {
      it(`${nom} ${type} n'ajoute pas de Cas pratique TAXI`, () => {
        expect(defaults[type]).not.toContain(12);
      });
    }
  }
  it("la pratique seule reste limitée au module 6", () => {
    expect(modulesAttribuesDashboard("taxi", [6]).map(m => m.id)).toEqual([6]);
  });
  it("les accès réparés rendent le module visible en TAXI et TA", () => {
    expect(modulesAttribuesDashboard("taxi", [1,10,7,3,9,13,11,36,6,84,64,12]).map(m => m.id)).toContain(12);
    expect(modulesAttribuesDashboard("taxi-pour-vtc", [31,40,7,3,27,28,37,6,84,64,12]).map(m => m.id)).toContain(12);
  });
});