import { describe, it, expect } from "vitest";
import { completionAvecActivites, activitesDuModule, ACTIVITES_CODE, UNITES_JEUX_LYON, idsActivites } from "@/lib/jeuxPedagogiques";
import { calculerPoids, unites, MODULES_PONDERES, PRATIQUE_PHYSIQUE, type VolumeModule } from "@/lib/jalonsPonderes";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";

const v8: VolumeModule = { pages: 20, questions: 40 }; // 120 unités fictives
const acts = activitesDuModule(8);
const [J1, J2] = acts.map((j) => j.id);
const parcours = (k: string) => FORMATION_MODULES[k].modules.map((m) => m.id);

describe("registre d'activités → jalons", () => {
  it("volumes réels : 22 + 24 placements, une seule fois", () => {
    expect(UNITES_JEUX_LYON).toBe(46);
    expect(unites({ ...v8, jeux: 46 })).toBe(166);
  });
  it("cibles = parcours réels : VTC et VA, jamais TAXI/TA", () => {
    expect(idsActivites(parcours("vtc-e"))).toEqual([J1, J2]);
    expect(idsActivites(parcours("va-e"))).toEqual([J1, J2]);
    expect(idsActivites(parcours("taxi-e"))).toEqual([]);
    expect(idsActivites(parcours("ta-e"))).toEqual([]);
  });
  it("module validé (version antérieure) sans les nouvelles activités : pas 100 %, statut signalé", () => {
    const r = completionAvecActivites({ module_id: 8, status: "completed", progress: 100, completed_at: "2026-10-01T08:00:00Z" }, v8, acts, new Set());
    expect(r.completion.status).not.toBe("completed");
    expect(r.completion.progress).toBeCloseTo(120 / 166 * 100, 5);
    expect(r.etat.versionAnterieureValidee).toBe(true);
  });
  it("un seul jeu : partiel ; module + deux jeux : 100 %", () => {
    expect(completionAvecActivites({ module_id: 8, status: "completed" }, v8, acts, new Set([J1])).completion.progress).toBeCloseTo(142 / 166 * 100, 5);
    expect(completionAvecActivites({ module_id: 8, status: "completed" }, v8, acts, new Set([J1, J2])).completion).toMatchObject({ status: "completed", progress: 100 });
  });
  it("jeux faits sans module terminé : jamais 100 %", () => {
    const r = completionAvecActivites({ module_id: 8, status: "in_progress", progress: 50 }, v8, acts, new Set([J1, J2]));
    expect(r.completion.progress).toBeCloseTo((60 + 46) / 166 * 100, 5);
  });
  it("ajout puis retrait d'une activité du registre : pris en compte puis retiré", () => {
    const nouvelle = { id: "x_test", moduleId: 8, titre: "Fictive", unites: 10, ajouteeLe: "2026-10-13T00:00:00Z" };
    ACTIVITES_CODE.push(nouvelle);
    try {
      expect(activitesDuModule(8).map((a) => a.id)).toContain("x_test");
      (nouvelle as any).retireeLe = "2026-10-13T01:00:00Z";
      expect(activitesDuModule(8).map((a) => a.id)).not.toContain("x_test");
    } finally { ACTIVITES_CODE.pop(); }
  });
  it("le poids du module 8 augmente avec les activités (VTC fictif)", () => {
    const base = Object.fromEntries(MODULES_PONDERES.vtc.map((id) => [id, id === PRATIQUE_PHYSIQUE ? { pages: 0, questions: 0, points: 360 } : id === 8 ? v8 : { pages: 30, questions: 100 }])) as Record<number, VolumeModule>;
    expect(calculerPoids("vtc", { ...base, 8: { ...v8, jeux: 46 } })[8]).toBeGreaterThan(calculerPoids("vtc", base)[8]);
  });
});
