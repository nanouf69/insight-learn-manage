import { describe, it, expect } from "vitest";
import { PRATIQUE_PHYSIQUE, calculerPoids, calculerDureesPrevisionnelles, BUDGET_CPF, type Filiere } from "@/lib/jalonsPonderes";
import { assemblerCalculJalons } from "@/lib/jalonsCalculCore";
import { construireVolumes } from "@/lib/jalonsVolumes";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";
import { modulesAttribuesDashboard } from "@/lib/parcoursModulesDashboard";
import { avecJalonPratique } from "@/lib/jalonsPonderes";

const ids = (k: string) => FORMATION_MODULES[k].modules.map((m) => m.id);
const q = (id: number) => ({ id, enonce: `Q${id}`, choix: [] });
const exo = (n: number) => ({ id: 1, titre: "E", actif: true, questions: Array.from({ length: n }, (_, i) => q(i + 1)) });
const examens = (type: string) => Array.from({ length: 8 }, (_, i) => ({ type, numero: i + 1, matieres: [{ questions: [q(1), q(2)] }] }));
const initial = () => ({ cours: [], exercices: [exo(10)] });
const vol = (f: Filiere, k: string) => construireVolumes(f, ids(k), [], initial as any, examens(f.toUpperCase()) as any).volumes;
const sum = (p: Record<number, number>) => Object.values(p).reduce((a, b) => a + b, 0);
const ATTR_VTC = modulesAttribuesDashboard("vtc-elearning", [26, 2, 3, 4, 35, 5, 8]).map((m) => m.id);

const calc = (completions: any[], modulesAttribues?: number[] | null) => assemblerCalculJalons({
  key: "vtc-e", filiere: "vtc", parcoursInitial: ids("vtc-e"), parcours: avecJalonPratique(ids("vtc-e")),
  editorRows: [], examens: examens("VTC"), initialDe: initial as any, pratiqueDetails: [], emargements: [],
  completions, heuresValidees: [], modulesAttribues,
});

describe("jalons sur le parcours réellement attribué", () => {
  it("attribution parent/enfant normalisée : 60/70 absents, sans doublon", () => {
    expect(ATTR_VTC).not.toContain(60);
    expect(ATTR_VTC).not.toContain(70);
    expect(new Set(ATTR_VTC).size).toBe(ATTR_VTC.length);
    expect(modulesAttribuesDashboard("vtc-elearning", [26, 25, 14, 3]).map((m) => m.id)).toContain(2);
  });
  it("renormalise à 100 ; EB, présentiel et total CPF inchangés", () => {
    const v = vol("vtc", "vtc-e");
    const complet = calculerPoids("vtc", v);
    const reel = calculerPoids("vtc", v, new Set(ATTR_VTC));
    expect(sum(reel)).toBeCloseTo(100, 6);
    expect(reel[60]).toBeUndefined();
    expect(reel[70]).toBeUndefined();
    expect(reel[35]).toBe(complet[35]);
    expect(reel[PRATIQUE_PHYSIQUE]).toBe(complet[PRATIQUE_PHYSIQUE]);
    expect(sum(calculerDureesPrevisionnelles("vtc", v, new Set(ATTR_VTC)))).toBe(BUDGET_CPF.vtc.total);
  });
  it("tous modules attribués completed : 100 % pédagogique, module 50 et pratique restent à faire", () => {
    const comp = ATTR_VTC.map((id) => ({ module_id: id, status: "completed" }));
    const avant = calc(comp);
    const apres = calc(comp, ATTR_VTC);
    expect(avant.resultat.lignes.find((l) => l.moduleId === 60)?.contribution).toBe(0);
    expect(apres.resultat.lignes.some((l) => l.moduleId === 60 || l.moduleId === 70)).toBe(false);
    const peda = apres.resultat.lignes.filter((l) => l.moduleId !== PRATIQUE_PHYSIQUE && l.poids > 0);
    expect(peda.every((l) => l.progression === 100)).toBe(true);
    expect(apres.resultat.jalonsObligatoiresManquants).toContain(50);
    expect(apres.resultat.taux).toBeLessThan(100);
    expect(apres.resultat.taux).toBeGreaterThan(avant.resultat.taux);
  });
  it("attribution vide/absente = comportement existant inchangé (calculs figés)", () => {
    const comp = [{ module_id: 2, status: "completed" }];
    expect(calc(comp, []).resultat).toEqual(calc(comp).resultat);
    expect(calc(comp, null).poids).toEqual(calc(comp).poids);
  });
  it("le score n'intervient pas : in_progress compte la progression réalisée", () => {
    const r = calc([{ module_id: 2, status: "in_progress", progress: 50 }], ATTR_VTC);
    expect(r.resultat.lignes.find((l) => l.moduleId === 2)?.progression).toBe(50);
  });
});
