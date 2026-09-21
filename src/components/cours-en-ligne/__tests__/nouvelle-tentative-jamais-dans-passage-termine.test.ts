import { describe, expect, it } from "vitest";
import { allocateFreshExamMatiereExerciceId } from "../examens-blancs-utils";

describe("Une tentative terminée est immuable", () => {
  it("réutilise la clé canonique quand aucun passage n'est verrouillé", () => {
    expect(allocateFreshExamMatiereExerciceId("EB1", "francais", 1, new Set())).toBe("EB1__francais");
  });

  it("n'écrit jamais dans un passage déjà terminé", () => {
    const frozen = new Set(["EB1__francais"]);
    expect(allocateFreshExamMatiereExerciceId("EB1", "francais", 1, frozen)).toBe("EB1__francais__t2");
  });

  it("saute tous les passages verrouillés successifs", () => {
    const frozen = new Set(["EB1__francais", "EB1__francais__t2", "EB1__francais__t3"]);
    expect(allocateFreshExamMatiereExerciceId("EB1", "francais", 1, frozen)).toBe("EB1__francais__t4");
  });

  it("repart du numéro de tentative demandé pour un vrai « Refaire l'examen »", () => {
    const frozen = new Set(["EB1__francais", "EB1__francais__t2"]);
    expect(allocateFreshExamMatiereExerciceId("EB1", "francais", 3, frozen)).toBe("EB1__francais__t3");
  });

  it("produit des clés distinctes par matière", () => {
    const frozen = new Set(["EB1__francais"]);
    expect(allocateFreshExamMatiereExerciceId("EB1", "gestion", 1, frozen)).toBe("EB1__gestion");
  });
});
