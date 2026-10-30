import { describe, it, expect } from "vitest";
import { DEFAULT_MODULES_BY_TYPE as creation } from "@/components/apprenants/ApprenantForm";
import { DEFAULT_MODULES_BY_TYPE as modification } from "@/components/apprenants/ApprenantEditForm";
import { DEFAULT_MODULES_BY_TYPE as catalogue } from "@/components/cours-en-ligne/modules-config";
import { modulesExigesDashboard, resolveFormationId } from "@/lib/parcoursModulesDashboard";

const cas = [
  { type: "taxi", attendus: [61, 71, 51], taille: 15, emargement: true },
  { type: "taxi-e", attendus: [61, 71, 51], taille: 14, emargement: false },
  { type: "ta", attendus: [62, 72, 52], taille: 15, emargement: true },
  { type: "ta-e", attendus: [62, 72, 52], taille: 14, emargement: false },
];
const tri = (l: number[]) => [...l].sort((a, b) => a - b);

describe("Nouvelle inscription TAXI/TA : formulaire → base → jalons", () => {
  for (const c of cas) {
    it(`${c.type} : formulaire = catalogue = jalons (${c.taille} modules)`, () => {
      const enregistre = [...creation[c.type]]; // copie écrite dans modules_autorises
      expect(tri(enregistre)).toEqual(tri(catalogue[c.type]));
      expect(tri(modification[c.type])).toEqual(tri(catalogue[c.type]));
      const formation = resolveFormationId(c.type, null, enregistre);
      const jalons = modulesExigesDashboard(formation, enregistre, []).map(m => m.id);
      expect(tri(jalons)).toEqual(tri(enregistre));
      expect(jalons.length).toBe(c.taille);
      for (const id of c.attendus) expect(jalons.filter(x => x === id)).toEqual([id]);
      expect(jalons.includes(84)).toBe(c.emargement);
    });
    it(`${c.type} : liste NULL → parcours complet par défaut`, () => {
      const formation = resolveFormationId(c.type, null, null);
      const jalons = modulesExigesDashboard(formation, null, []).map(m => m.id);
      expect(tri(jalons)).toEqual(tri(catalogue[c.type]));
    });
  }
  it("élève existant à liste incomplète : rien n'est ajouté ni retiré à l'affichage", () => {
    const ancienne = [1, 10, 7, 3, 9, 13, 11, 36, 6, 84, 64, 12];
    const jalons = modulesExigesDashboard(resolveFormationId("taxi", "taxi-exam", ancienne), ancienne, []).map(m => m.id);
    expect(tri(jalons)).toEqual(tri(ancienne));
  });
  it("Fin de formation n'est jamais considérée terminée sans preuve", () => {
    const jalons = modulesExigesDashboard("taxi", creation.taxi, []);
    expect(jalons.some(m => m.id === 51)).toBe(true);
  });
});
