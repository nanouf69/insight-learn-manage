import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { MODULES_FILIERE, MODULES_PONDERES, INTRO, PRATIQUE_PHYSIQUE, avecJalonPratique, calculerJalonsPonderes, calculerPoids, completionPratique, filiereDuParcours, unites, type Filiere } from "@/lib/jalonsPonderes";
import { construireVolumes } from "@/lib/jalonsVolumes";
import { compterQuestionsActives, contenuEffectif } from "@/lib/volumeModules";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";

const ids = (k: string) => FORMATION_MODULES[k].modules.map((m) => m.id);
const all = (k: string) => ids(k).map((id) => ({ module_id: id, status: "completed" }));
const q = (id: number, extra: any = {}) => ({ id, enonce: `Q${id}`, choix: [], ...extra });
const exo = (id: number, n: number, extra: any = {}) => ({ id, titre: `E${id}`, actif: true, questions: Array.from({ length: n }, (_, i) => q(i + 1)), ...extra });
const examens = (type: string) => Array.from({ length: 8 }, (_, i) => ({ type, numero: i + 1, matieres: [{ questions: [q(1), q(2)] }] }));
const vol = (f: Filiere, k: string, rows: any[] = [], initial: (id: number) => any = () => ({ cours: [], exercices: [exo(1, 10)] })) =>
  construireVolumes(f, ids(k), rows, initial, examens(f.toUpperCase()));
const sum = (p: Record<number, number>) => Object.values(p).reduce((a, b) => a + b, 0);

describe("jalons pondérés par volume", () => {
  it("poids de chaque filière somment 100 (aucun % figé)", () => {
    for (const [f, k] of [["vtc", "vtc-e"], ["taxi", "taxi"], ["ta", "ta"], ["va", "va-e"]] as const) {
      const volumes = vol(f, k).volumes;
      const totalPoints = MODULES_PONDERES[f].reduce((total, id) => total + unites(volumes[id]), 0);
      const poids = calculerPoids(f, volumes);
      expect(sum(poids)).toBeCloseTo(100, 6);
      for (const id of MODULES_PONDERES[f]) expect(poids[id]).toBeCloseTo((unites(volumes[id]) / totalPoints) * 100, 10);
    }
    expect(readFileSync("src/lib/jalonsPonderes.ts", "utf8")).not.toMatch(/GRILLE_JALONS|42\b/);
  });
  it("ajout d'une/plusieurs questions : module monte, autres baissent, somme 100", () => {
    const base = calculerPoids("vtc", vol("vtc", "vtc-e").volumes);
    for (const n of [1, 25]) {
      const rows = [{ module_id: 2, module_data: { exercices: [exo(1, 10 + n)] } }];
      const p = calculerPoids("vtc", vol("vtc", "vtc-e", rows).volumes);
      expect(p[2]).toBeGreaterThan(base[2]);
      for (const id of MODULES_FILIERE.vtc.filter((x) => x !== 2 && base[x] > 0)) expect(p[id]).toBeLessThan(base[id]);
      expect(sum(p)).toBeCloseTo(100, 6);
    }
  });
  it("supprimées / désactivées / masquées / exercice supprimé ou inactif => exclues", () => {
    const md = { exercices: [exo(1, 5, { deletedQuestionIds: [1] }), { ...exo(2, 3), actif: false }, exo(3, 2)] };
    md.exercices[2].questions[0].actif = false;
    md.exercices[0].questions.push(q(9, { masque: true }));
    const c = contenuEffectif({ cours: [], exercices: [exo(4, 7)] }, { module_id: 2, module_data: md, deleted_exercices: [{ id: 4 }] });
    expect(compterQuestionsActives(c).total).toBe(4 + 1);
  });
  it("quiz intégré aux cours compté ; cours inactif ignoré", () => {
    const c = { cours: [{ id: 1, actif: true, quiz: [q(1), q(2)] }, { id: 2, actif: false, quiz: [q(3)] }], exercices: [] };
    expect(compterQuestionsActives(c)).toEqual({ exercices: 0, inline: 2, total: 2 });
  });
  it("état enregistré prioritaire, contenu par défaut sinon", () => {
    const init = { cours: [], exercices: [exo(1, 10)] };
    expect(compterQuestionsActives(contenuEffectif(init, null)).total).toBe(10);
    expect(compterQuestionsActives(contenuEffectif(init, { module_id: 2, module_data: { exercices: [exo(1, 3)] } })).total).toBe(3);
  });
  it("module partagé TAXI/TA (7) : même volume dans les deux filières, chaque filière somme 100", () => {
    const rows = [{ module_id: 7, module_data: { exercices: [exo(1, 40)] } }];
    const t = vol("taxi", "taxi", rows), a = vol("ta", "ta", rows);
    expect(t.volumes[7].questions).toBe(40);
    expect(a.volumes[7].questions).toBe(40);
    expect(sum(calculerPoids("taxi", t.volumes))).toBeCloseTo(100, 6);
    expect(sum(calculerPoids("ta", a.volumes))).toBeCloseTo(100, 6);
  });
  it("examens blancs : 6 premiers examens du type, une fois chacun", () => {
    expect(vol("vtc", "vtc-e").volumes[35].questions).toBe(12);
    expect(() => construireVolumes("vtc", ids("vtc-e"), [], () => null, [])).toThrow();
  });
  it("supports modifiés depuis l'audit => limite signalée (pas d'illusion de recomptage)", () => {
    const rows = [{ module_id: 2, module_data: { cours: [{ id: 1, actif: true, fichiers: [{ url: "nouveau.pdf" }] }], exercices: [] } }];
    expect(vol("vtc", "vtc-e", rows).limites.join(" ")).toMatch(/Module 2 : supports modifiés/);
  });
  it("0 partout => 0 ; tout complet => 100 ; fin non validée => 99.9", () => {
    const p = calculerPoids("vtc", vol("vtc", "vtc-e").volumes);
    const parcours = avecJalonPratique(ids("vtc-e"));
    expect(calculerJalonsPonderes("vtc", parcours, [], p).taux).toBe(0);
    const complet = [...all("vtc-e"), completionPratique(360)];
    expect(calculerJalonsPonderes("vtc", parcours, complet, p).taux).toBe(100);
    const r = calculerJalonsPonderes("vtc", parcours, complet.filter((c) => c.module_id !== 50), p);
    expect(r.taux).toBe(99.9);
    expect(r.jalonsObligatoiresManquants).toContain(50);
  });
  it("module absent du parcours : pas de renormalisation", () => {
    const p = calculerPoids("vtc", vol("vtc", "vtc-e").volumes);
    const parcours = avecJalonPratique(ids("vtc-e").filter((id) => id !== 35));
    const r = calculerJalonsPonderes("vtc", parcours, parcours.map((id) => ({ module_id: id, status: "completed" })) , p);
    expect(r.taux).toBeCloseTo(Math.round((100 - p[35]) * 10) / 10, 5);
  });
  it("tentatives en double n'ajoutent rien ; progress 100 sans completed => jamais 100", () => {
    const p = calculerPoids("vtc", vol("vtc", "vtc-e").volumes);
    const un = calculerJalonsPonderes("vtc", ids("vtc-e"), [{ module_id: 2, status: "in_progress", progress: 50 }], p).taux;
    expect(calculerJalonsPonderes("vtc", ids("vtc-e"), [{ module_id: 2, status: "in_progress", progress: 50 }, { module_id: 2, status: "in_progress", progress: 50 }], p).taux).toBe(un);
    const rows = [...all("vtc-e").map((c) => (c.module_id === 2 ? { module_id: 2, status: "in_progress", progress: 100 } : c)), completionPratique(360)];
    expect(calculerJalonsPonderes("vtc", avecJalonPratique(ids("vtc-e")), rows, p).taux).toBe(99.9);
  });
  it("alias filière, intro présentiel et poids intro une seule fois", () => {
    expect(filiereDuParcours("ta-e-presentiel")).toBe("ta");
    expect(filiereDuParcours("continue-vtc")).toBeNull();
    const v = construireVolumes("ta", ids("ta"), [], () => null, examens("TA"));
    expect(v.volumes[INTRO].moduleId).toBe(31);
    const p = calculerPoids("vtc", vol("vtc", "vtc-e").volumes);
    const parcours = avecJalonPratique([26, 1, ...ids("vtc-e").filter((id) => id !== 26)]);
    const r = calculerJalonsPonderes("vtc", parcours, parcours.map((id) => ({ module_id: id, status: "completed" })), p);
    expect(r.lignes.reduce((s, l) => s + l.poids, 0)).toBeCloseTo(100, 5);
    expect(r.lignes.find((l) => l.moduleId === 1)!.poids).toBe(0);
    const card = readFileSync("src/components/crm/apprenant-sections/JalonsPonderesCard.tsx", "utf8");
    expect(card).toMatch(/l\.poids > 0 \? unites/);
    expect(card).toMatch(/MODULES_PONDERES\[calcul\.filiere\].*unites/);
  });
  it("carte placée sous la tuile Modules, admin uniquement, actualisée en direct", () => {
    const page = readFileSync("src/components/crm/ApprenantDetailPage.tsx", "utf8");
    expect(page.match(/<JalonsPonderesCard/g)!.length).toBe(1);
    const src = readFileSync("src/components/crm/apprenant-sections/JalonsPonderesCard.tsx", "utf8");
    expect(src).toMatch(/user_roles[\s\S]*eq\("role", "admin"\)/);
    expect(src).toMatch(/adminCheck\?\.userId === userId/);
    expect(src).toMatch(/table: "module_editor_state"/);
    expect(src).toMatch(/refetchOnWindowFocus: true/);
    expect(src).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(readFileSync("src/pages/CoursPublic.tsx", "utf8")).not.toMatch(/JalonsPonderes/);
  });
});

import { arrondirPoidsAffichage } from "@/lib/jalonsPonderes";
import { compterQuestionsExamensBlancs } from "@/lib/volumeModules";
describe("revue jalons", () => {
  it("questions_masquees_bilan (structure réelle) exclues, par uid ou exercice+id", () => {
    const md = { exercices: [{ id: 7, titre: "B", actif: true, questions: [q(116, { uid: "u-116" }), q(117), q(118)] }],
      questions_masquees_bilan: [{ motif: "QRC", exercice_id: 7, masquee_le: "2026-09-24", question: { id: 116, uid: "u-116" } }, { motif: "QRC", exercice_id: 7, question: { id: 117 } }] };
    expect(compterQuestionsActives(contenuEffectif(null, { module_id: 5, module_data: md })).total).toBe(1);
  });
  it("deleted_cours et deletedQuestionIds des quiz intégrés exclus ; quiz source jamais réinjecté", () => {
    const init = { cours: [{ id: 1, actif: true, quiz: [q(1), q(2)], slidesKey: "k" }], exercices: [] };
    const row = { module_id: 2, deleted_cours: [{ id: 2 }], module_data: { cours: [{ id: 1, actif: true }, { id: 2, actif: true, quiz: [q(5)] }, { id: 3, actif: true, quiz: [q(1), q(2)], deletedQuestionIds: [2] }] } };
    expect(compterQuestionsActives(contenuEffectif(init, row))).toEqual({ exercices: 0, inline: 1, total: 1 });
  });
  it("examens blancs : bilan-*, inactifs, retirés, doublons de numéro exclus", () => {
    const m = (n: number) => [{ questions: Array.from({ length: n }, (_, i) => q(i)) }];
    const ex = [
      { id: "vtc-1", type: "VTC", numero: 1, matieres: m(3) }, { id: "vtc-1b", type: "VTC", numero: 1, matieres: m(50) },
      { id: "bilan-vtc", type: "VTC", numero: 2, matieres: m(50) }, { id: "vtc-3", type: "VTC", numero: 3, matieres: m(50), actif: false },
      { id: "vtc-4", type: "VTC", numero: 4, matieres: m(50), retired: true }, { id: "vtc-5", type: "VTC", numero: 5, matieres: [{ questions: [q(1), q(2, { actif: false })] }] },
    ];
    expect(compterQuestionsExamensBlancs(ex, "VTC")).toEqual({ examens: 2, questions: 4, doublons: 1 });
  });
  it("poids affichés arrondis à 0,1 : somme exactement 100", () => {
    for (const p of [[33.333, 33.333, 33.334], [46.67, 2.14, 17.33, 19.8, 5.0, 1.1, 0.8, 7.0, 0.16], [1, 1, 1, 1, 1, 1, 1]]) {
      const a = arrondirPoidsAffichage(p);
      expect(Math.round(a.reduce((x, y) => x + y, 0) * 10)).toBe(1000);
    }
  });
  it("invalidation explicite après enregistrement de l'éditeur", () => {
    for (const f of ["src/components/cours-en-ligne/ExamensBlancsEditor.tsx", "src/components/cours-en-ligne/ModuleDetailView.tsx", "src/components/cours-en-ligne/shared-exercise-overrides.ts"])
      expect(readFileSync(f, "utf8")).toMatch(/signalerContenuModifie\(/);
    const card = readFileSync("src/components/crm/apprenant-sections/JalonsPonderesCard.tsx", "utf8");
    expect(card).toMatch(/ecouterContenuModifie/);
    expect(card).toMatch(/!calcul \|\| isFetching/);
  });
  it("jalon pratique virtuel : 360 points et progression 0 / 3 h / 6 h", () => {
    const volumes = vol("vtc", "vtc-e").volumes;
    const p = calculerPoids("vtc", volumes);
    expect(unites(volumes[PRATIQUE_PHYSIQUE])).toBe(360);
    expect(completionPratique(0).progress).toBe(0);
    expect(completionPratique(180).progress).toBe(50);
    expect(completionPratique(360)).toMatchObject({ progress: 100, status: "completed" });
    expect(sum(p)).toBeCloseTo(100, 6);
  });
});
