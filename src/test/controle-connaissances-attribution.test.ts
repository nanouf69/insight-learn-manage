import { describe, it, expect } from "vitest";
import { DEFAULT_MODULES_BY_TYPE as creation } from "@/components/apprenants/ApprenantForm";
import { DEFAULT_MODULES_BY_TYPE as modification } from "@/components/apprenants/ApprenantEditForm";
import { modulesAttribuesDashboard } from "@/lib/parcoursModulesDashboard";

describe("Contrôle de connaissances TAXI/TA : attribution ciblée", () => {
  for (const [nom, defaults] of [["création", creation], ["modification", modification]] as const) {
    for (const type of ["taxi", "taxi-e", "taxi-e-presentiel", "ta", "ta-e", "ta-e-presentiel"]) {
      it(`${nom} ${type} attribue le contrôle 13 une seule fois`, () => {
        expect(defaults[type].filter(id => id === 13)).toEqual([13]);
      });
    }
  }
  it("les trois listes TA réparées affichent le contrôle sans retirer de module", () => {
    const initial = [31,40,7,3,27,28,37,6,84,64,12];
    const displayed = modulesAttribuesDashboard("taxi-pour-vtc", [...initial,13]).map(m => m.id);
    expect(displayed).toContain(13);
    for (const id of initial) expect(displayed).toContain(id);
  });
  it("une liste explicite non réparée reste inchangée", () => {
    expect(modulesAttribuesDashboard("taxi-pour-vtc", [31,40,7,3,27,28,37,6,84,64,12]).map(m => m.id)).not.toContain(13);
    expect(modulesAttribuesDashboard("taxi", [6]).map(m => m.id)).toEqual([6]);
  });
});