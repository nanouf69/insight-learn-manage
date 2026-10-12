// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BUDGET_CPF, GRILLE_DUREES, INTRO, PRATIQUE_PHYSIQUE, EXAMENS_BLANCS_FILIERE, arrondirPoidsAffichage, calculerDureesPrevisionnelles, calculerPoids, completionPratique, type Filiere } from "@/lib/jalonsPonderes";

// Volumes égaux aux volumes de référence (2×pages+questions) => tableau approuvé exact.
const volRef = (f: Filiere, override: Record<number, number> = {}) => {
  const v: Record<number, any> = {};
  for (const [id, , ref] of GRILLE_DUREES[f]) v[id] = { pages: 0, questions: override[id] ?? ref };
  v[EXAMENS_BLANCS_FILIERE[f].moduleId] = { pages: 0, questions: 999 };
  v[PRATIQUE_PHYSIQUE] = { pages: 0, questions: 0, points: 360 };
  return v;
};
// Ordre : intro,cours,formules,bilanEx,EB,bilanExam,ville,equip,cas,controle,sources,revisions,pratiqueEnLigne,presentiel
const ORDRE: Record<Filiere, (number | null)[]> = {
  vtc: [INTRO, 2, 3, 4, 35, 5, null, null, null, null, 60, 70, 8, PRATIQUE_PHYSIQUE],
  taxi: [INTRO, 10, 3, 9, 36, 11, 7, 64, 12, 13, 61, 71, 6, PRATIQUE_PHYSIQUE],
  ta: [INTRO, 40, 3, 27, 37, 28, 7, 64, 12, 13, 62, 72, 6, PRATIQUE_PHYSIQUE],
  va: [INTRO, 41, 3, 29, 38, 30, null, null, null, null, 63, 73, 8, PRATIQUE_PHYSIQUE],
};
const MIN: Record<Filiere, number[]> = {
  vtc: [19, 914, 44, 497, 1380, 528, 0, 0, 0, 0, 16, 101, 101, 360],
  taxi: [28, 1419, 63, 784, 1380, 782, 392, 26, 53, 186, 26, 176, 85, 360],
  ta: [57, 279, 62, 200, 300, 86, 383, 26, 51, 182, 21, 69, 84, 360],
  va: [30, 303, 106, 181, 300, 523, 0, 0, 0, 0, 33, 80, 244, 360],
};
const POIDS: Record<Filiere, number[]> = {
  vtc: [.5, 23.1, 1.1, 12.6, 34.8, 13.3, 0, 0, 0, 0, .4, 2.6, 2.5, 9.1],
  taxi: [.5, 24.6, 1.1, 13.6, 24, 13.6, 6.8, .5, .9, 3.2, .4, 3.1, 1.5, 6.2],
  ta: [2.6, 12.9, 2.9, 9.2, 13.9, 4, 17.7, 1.2, 2.4, 8.4, 1, 3.2, 3.9, 16.7],
  va: [1.4, 14, 4.9, 8.4, 13.9, 24.2, 0, 0, 0, 0, 1.5, 3.7, 11.3, 16.7],
};
const F: Filiere[] = ["vtc", "taxi", "ta", "va"];

describe("Répartition prévisionnelle CPF", () => {
  it("reproduit exactement le tableau approuvé (minutes et poids affichés)", () => {
    for (const f of F) {
      const d = calculerDureesPrevisionnelles(f, volRef(f));
      const ids = ORDRE[f].filter((x): x is number => x !== null);
      expect(ids.map((id) => d[id])).toEqual(MIN[f].filter((_, i) => ORDRE[f][i] !== null));
      expect(Object.values(d).reduce((a, b) => a + b, 0)).toBe(BUDGET_CPF[f].total);
      const p = calculerPoids(f, volRef(f));
      expect(arrondirPoidsAffichage(ids.map((id) => p[id]))).toEqual(POIDS[f].filter((_, i) => ORDRE[f][i] !== null));
    }
    expect([BUDGET_CPF.vtc.total, BUDGET_CPF.taxi.total, BUDGET_CPF.ta.total, BUDGET_CPF.va.total]).toEqual([3960, 5760, 2160, 2160]);
  });
  it("ajout de questions : EB et présentiel jamais modifiés, total inchangé, module concerné augmente", () => {
    for (const f of F) {
      const base = calculerDureesPrevisionnelles(f, volRef(f));
      const coursId = ORDRE[f][1] as number;
      const ref = GRILLE_DUREES[f].find(([id]) => id === coursId)![2];
      const plus = calculerDureesPrevisionnelles(f, { ...volRef(f, { [coursId]: ref + 300 }), [EXAMENS_BLANCS_FILIERE[f].moduleId]: { pages: 0, questions: 5000 } });
      expect(plus[EXAMENS_BLANCS_FILIERE[f].moduleId]).toBe(BUDGET_CPF[f].examensBlancs);
      expect(plus[PRATIQUE_PHYSIQUE]).toBe(360);
      expect(plus[coursId]).toBeGreaterThan(base[coursId]);
      expect(Object.values(plus).reduce((a, b) => a + b, 0)).toBe(BUDGET_CPF[f].total);
    }
  });
  it("volume indisponible => erreur, aucune grille de repli", () => {
    const v = volRef("vtc"); delete v[2];
    expect(() => calculerDureesPrevisionnelles("vtc", v)).toThrow();
  });
  it("présentiel : 0 / 3 h / 6 h prouvées", () => {
    expect(completionPratique(0).progress).toBe(0);
    expect(completionPratique(180).progress).toBe(50);
    expect(completionPratique(360).status).toBe("completed");
    expect(completionPratique(720).progress).toBe(100);
  });
});
