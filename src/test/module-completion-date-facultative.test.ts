import { describe, it, expect } from "vitest";
import { isCompletionDone } from "@/lib/moduleCompletion";
import { computeServerCompletedModuleIds } from "@/lib/moduleUnlockLogic";
import { instantValidationModule, activitesRequisesModule } from "@/lib/jeuxPedagogiques";
import { progressionModulesEleve } from "@/lib/progressionModulesEleve";

// Depuis 0197 (23/10/2026), une progression non validée a completed_at = NULL.
// Le contrat serveur réel est testé sur base jetable : module_completion_sql_contract.py.
const id = (n: number) => n;

describe("lecteurs : date de fin facultative", () => {
  it("in_progress sans date = non terminé, jamais une fin", () => {
    expect(isCompletionDone({ module_id: 2, status: "in_progress", completed_at: null, progress: 100 })).toBe(false);
    expect(instantValidationModule({ status: "in_progress", completed_at: null })).toBeNull();
    expect([...computeServerCompletedModuleIds([{ module_id: 2, status: "in_progress", completed_at: null }] as any, {}, id)]).toEqual([]);
  });

  it("ancienne ligne in_progress avec date de création héritée = toujours non terminée", () => {
    expect(isCompletionDone({ module_id: 2, status: "in_progress", completed_at: "2026-09-01T10:00:00Z" })).toBe(false);
    expect(instantValidationModule({ status: "in_progress", completed_at: "2026-09-01T10:00:00Z" })).toBeNull();
  });

  it("validé avant l'ajout des jeux (17/09 < 13/10) : jeux facultatifs, gel conservé", () => {
    const ligne = { status: "completed", completed_at: "2026-09-17T08:00:00Z" };
    expect(activitesRequisesModule(8, ligne, "2026-10-23T08:00:00Z")).toEqual([]);
    const p: any = progressionModulesEleve([{ id: 8, nom: "PRATIQUE VTC" }], () => true, new Set(), "2026-10-23T08:00:00Z", "fictif",
      [{ module_id: 8, status: "completed", completed_at: "2026-09-17T08:00:00Z" }] as any);
    expect(p.termines).toBe(1);
  });

  it("cas Hedy : 4 lignes completed + 1 in_progress sans date sur 7 = 4/7", () => {
    const done = new Set([2, 3, 4, 26]);
    const p: any = progressionModulesEleve([26, 2, 3, 4, 35, 5, 8].map((m) => ({ id: m, nom: String(m) })), (m) => done.has(m), new Set());
    expect([p.termines, p.total]).toEqual([4, 7]);
  });
});
