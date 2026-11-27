import { describe, expect, it } from "vitest";
import { etapeApresMatiereSansResultat } from "@/lib/matiereSansResultatNavigation";

// Anonymized 27/11 case: 7 subjects, A done, B done, C closed empty (index 2).
describe("continuer après une matière sans réponse", () => {
  it("ouvre directement la matière suivante sans résultat, jamais l'écran de transition vide", () => {
    expect(etapeApresMatiereSansResultat(2, 7, [{ note: 9 }, { note: 8 }])).toEqual({ phase: "examen", matiereIndex: 3 });
  });
  it("saute les matières déjà notées", () => {
    expect(etapeApresMatiereSansResultat(0, 4, [undefined, { n: 1 }, { n: 2 }])).toEqual({ phase: "examen", matiereIndex: 3 });
  });
  it("revient à la liste quand il ne reste aucune matière", () => {
    expect(etapeApresMatiereSansResultat(6, 7, [])).toEqual({ phase: "selection" });
  });
});
