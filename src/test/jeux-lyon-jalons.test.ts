import { describe, it, expect } from "vitest";
import { completionAvecJeux, JEUX_LYON, UNITES_JEUX_LYON, DATE_EXIGENCE_JEUX } from "@/lib/jeuxPedagogiques";
import { calculerPoids, unites, MODULES_PONDERES, PRATIQUE_PHYSIQUE, type VolumeModule } from "@/lib/jalonsPonderes";

const v8: VolumeModule = { pages: 20, questions: 40 }; // 120 unités fictives
const [J1, J2] = JEUX_LYON.map((j) => j.id);

describe("jeux de Lyon dans les jalons du module 8", () => {
  it("volumes réels : 22 + 24 placements, une seule fois", () => {
    expect(UNITES_JEUX_LYON).toBe(46);
    expect(unites({ ...v8, jeux: 46 })).toBe(166);
  });
  it("module terminé mais jeux non faits (après l'exigence) : jamais 100 %", () => {
    const r = completionAvecJeux({ module_id: 8, status: "completed", progress: 100, completed_at: "2026-10-14T08:00:00Z" }, v8, new Set());
    expect(r.completion.status).not.toBe("completed");
    expect(r.completion.progress).toBeCloseTo(120 / 166 * 100, 5);
  });
  it("un seul jeu terminé : partiel ; les deux + module : 100 %", () => {
    expect(completionAvecJeux({ module_id: 8, status: "completed", completed_at: "2026-10-14T08:00:00Z" }, v8, new Set([J1])).completion.progress).toBeCloseTo(142 / 166 * 100, 5);
    expect(completionAvecJeux({ module_id: 8, status: "completed", completed_at: "2026-10-14T08:00:00Z" }, v8, new Set([J1, J2])).completion).toMatchObject({ status: "completed", progress: 100 });
  });
  it("jeux faits sans module terminé : jamais 100 %", () => {
    const r = completionAvecJeux({ module_id: 8, status: "in_progress", progress: 50 }, v8, new Set([J1, J2]));
    expect(r.completion.status).toBe("in_progress");
    expect(r.completion.progress).toBeCloseTo((60 + 46) / 166 * 100, 5);
  });
  it("validation historique avant l'exigence : statut conservé, rien de rétroactif", () => {
    const r = completionAvecJeux({ module_id: 8, status: "completed", completed_at: "2026-10-01T08:00:00Z" }, v8, new Set());
    expect(r.completion).toMatchObject({ status: "completed", progress: 100 });
    expect(r.etat.statutHistorique).toBe(true);
    expect("2026-10-01" < DATE_EXIGENCE_JEUX).toBe(true);
  });
  it("aucune ligne : 0, identifiant de jeu inconnu ignoré", () => {
    expect(completionAvecJeux(undefined, v8, new Set(["autre"])).completion.progress).toBe(0);
  });
  it("le poids du module 8 augmente seulement avec les jeux (VTC fictif)", () => {
    const base = Object.fromEntries(MODULES_PONDERES.vtc.map((id) => [id, id === PRATIQUE_PHYSIQUE ? { pages: 0, questions: 0, points: 360 } : id === 8 ? v8 : { pages: 30, questions: 100 }])) as Record<number, VolumeModule>;
    const avant = calculerPoids("vtc", base)[8];
    const apres = calculerPoids("vtc", { ...base, 8: { ...v8, jeux: 46 } })[8];
    expect(apres).toBeGreaterThan(avant);
  });
});
