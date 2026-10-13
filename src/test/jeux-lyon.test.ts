// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LYON_GEO } from "@/components/cours-en-ligne/jeux-lyon/lyon-geo-data";
import { evaluerArrondissement, evaluerLieu, evaluerQuartier, ficheLieu, melanger, pointsEssai, enregistrerMeilleurScore, lireMeilleurScore, METRES_PAR_UNITE } from "@/components/cours-en-ligne/jeux-lyon/jeuxLyonLogic";

const lieu = (id: string) => LYON_GEO.lieux.find((l) => l.id === id)!;
const zone = (id: string) => LYON_GEO.zones.find((z) => z.id === id)!;

describe("Jeux cartes de Lyon", () => {
  it("9 arrondissements distincts issus des contours officiels", () => {
    expect(LYON_GEO.arr.map((a) => a.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(LYON_GEO.eau.length).toBeGreaterThan(0);
  });
  it("arrondissement : seul le bon numéro est juste", () => {
    expect(evaluerArrondissement(4, 4)).toBe(true);
    expect(evaluerArrondissement(4, 1)).toBe(false);
    expect(evaluerArrondissement(4, null)).toBe(false);
  });
  it("quartiers partagés explicitement : Croix-Rousse 1er/4e, Presqu'île 1er/2e", () => {
    expect(zone("croixrousse").arrondissements).toEqual([1, 4]);
    expect(zone("presquile").arrondissements).toEqual([1, 2]);
    expect(evaluerQuartier(zone("croixrousse"), ["croixrousse"])).toBe(true);
    expect(evaluerQuartier(zone("croixrousse"), ["presquile"])).toBe(false);
  });
  it("lieux : arrondissements conformes au cours, Villeurbanne jamais arrondissement", () => {
    const attendu: Record<string, number> = { basilique: 5, lugdunum: 5, stjean: 5, gadagne: 5, bellecour: 2, mba: 1, confluences: 2, maisoncanuts: 4, mac: 6, teteor: 6, lumiere: 8, garepd: 3, tonygarnier: 7, blandan: 7 };
    for (const [id, n] of Object.entries(attendu)) expect(lieu(id).arrondissement, id).toBe(n);
    expect(lieu("tnp").arrondissement).toBe(0);
    expect(ficheLieu(lieu("tnp"))).toContain("commune limitrophe");
    expect(ficheLieu(lieu("basilique"))).toBe("Basilique Notre-Dame de Fourvière — Fourvière – Saint-Just — Lyon 5e arrondissement");
  });
  it("tolérance de placement raisonnable (≈ 400 m), pas au pixel", () => {
    const l = lieu("bellecour");
    expect(evaluerLieu(l, l.x, l.y).juste).toBe(true);
    const d300 = 300 / METRES_PAR_UNITE;
    expect(evaluerLieu(l, l.x + d300, l.y).juste).toBe(true);
    const d600 = 600 / METRES_PAR_UNITE;
    expect(evaluerLieu(l, l.x + d600, l.y)).toMatchObject({ juste: false, proche: true });
    expect(evaluerLieu(l, l.x + 2000 / METRES_PAR_UNITE, l.y).proche).toBe(false);
  });
  it("points : 1 / 0,5 / 0 ; mélange conserve les éléments", () => {
    expect([pointsEssai(1, true), pointsEssai(2, true), pointsEssai(1, false)]).toEqual([1, 0.5, 0]);
    expect(melanger([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
  });
  it("meilleur score local isolé par compte, jamais rétrogradé, rien sans compte", () => {
    const m = new Map<string, string>();
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(enregistrerMeilleurScore(s, null, "lieux", { score: 3, total: 4, date: "x" })).toBe(false);
    expect(enregistrerMeilleurScore(s, "A", "lieux", { score: 3, total: 4, date: "x" })).toBe(true);
    expect(enregistrerMeilleurScore(s, "A", "lieux", { score: 1, total: 4, date: "y" })).toBe(false);
    expect(lireMeilleurScore(s, "B", "lieux")).toBeNull();
    expect(lireMeilleurScore(s, "A", "lieux")?.score).toBe(3);
  });
  it("écriture uniquement via la file durable existante, jamais dans les quiz/exercices/notes", () => {
    const src = readFileSync("src/components/cours-en-ligne/jeux-lyon/JeuxCartesLyon.tsx", "utf8") + readFileSync("src/components/cours-en-ligne/jeux-lyon/jeuxLyonLogic.ts", "utf8");
    expect(src).not.toMatch(/supabase|fetch\(|module_editor_state|apprenant_quiz_results/);
    const suivi = readFileSync("src/components/cours-en-ligne/jeux-lyon/useSuiviJeu.ts", "utf8");
    expect(suivi).toContain("enqueueAnswerSave");
    expect(suivi).toContain("score: null");
    expect(suivi).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|apprenant_quiz_results|module_completion/);
    const mdv = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
    expect(mdv).toContain("activitesDuModule(Number(module.id)).some((a) => a.id.startsWith(\"jeu_lyon_\"))");
  });
});
