// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: any[]) => rpc(...a) } }));
vi.mock("@/lib/learnerPreviewGuard", () => ({ blockLearnerWrite: () => false }));

import { saveModuleCompletion, wasLastCompletionRefusedIncomplete } from "@/lib/moduleCompletion";

const migrations = join(process.cwd(), "drizzle/migrations");
const sqlOf = (needle: string) =>
  readdirSync(migrations).filter((f) => f.includes(needle)).map((f) => readFileSync(join(migrations, f), "utf8")).join("\n");

describe("Validation Terminé — preuve serveur (incidents GOUEPO)", () => {
  beforeEach(() => rpc.mockReset());

  it("B/F/G — refus serveur MODULE_INCOMPLET : pas de faux Terminé, pas de nouvel essai", async () => {
    rpc.mockResolvedValue({ error: { code: "P0501", message: "MODULE_INCOMPLET" } });
    const ok = await saveModuleCompletion({ apprenantId: "a", moduleId: 5, completed: true, retries: 5 });
    expect(ok).toBe(false);
    expect(wasLastCompletionRefusedIncomplete()).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("D — module réellement complété : confirmé par le serveur", async () => {
    rpc.mockResolvedValue({ error: null });
    expect(await saveModuleCompletion({ apprenantId: "a", moduleId: 8, completed: true })).toBe(true);
    expect(wasLastCompletionRefusedIncomplete()).toBe(false);
  });

  it("règle serveur : aucune modification d'un module déjà Terminé, modules sans questions inchangés", () => {
    const sql = sqlOf("module_completion_preuve_serveur");
    expect(sql).toMatch(/IF NOT v_deja_termine THEN/);
    expect(sql).toMatch(/IF v_nb_questions > 0 THEN/);
    expect(sql).toMatch(/P0501/);
    expect(sql).not.toMatch(/\bDELETE\b|\bTRUNCATE\b/i);
  });

  it("un ancien état client ne peut rétrograder Terminé ni diminuer sa progression", () => {
    const sql = sqlOf("module_completion_preuve_serveur");
    expect(sql).toMatch(/amc\.status\s*=\s*'completed'\s+OR\s+_completed/);
    expect(sql).toMatch(/GREATEST\s*\(\s*COALESCE\(amc\.progress/);
    expect(sql).toMatch(/WHEN amc\.status = 'completed' THEN amc\.completed_at/);
  });

  it("A — identifiant long 1785332774763 : plus de conversion integer dans les protections Bilan", () => {
    const sql = sqlOf("bilan_garde_ids_longs");
    expect(sql).toMatch(/length\(m\[2\]\) > 9/);
    expect(Number("1785332774763")).toBeGreaterThan(2147483647);
  });
});
