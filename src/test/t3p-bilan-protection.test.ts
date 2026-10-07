// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const view = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
const migration = readFileSync("drizzle/migrations/0128_protect_bilan_saves_and_shared_question_deltas.sql", "utf8");

describe("Approved T3P bilan protection", () => {
  it("keeps existing runtime course-to-bilan reconstruction disabled", () => {
    expect(view).toContain("const shouldSyncVtcBilanFromCours = (_moduleId: number | string) => false;");
    for (const call of view.matchAll(/const syncedVtcBilan = await loadSyncedVtcBilanFromCours/g)) {
      expect(view.slice(call.index! - 100, call.index)).toContain("if (shouldSyncVtcBilanFromCours(module.id))");
    }
    expect([...view.matchAll(/const syncedVtcBilan = await loadSyncedVtcBilanFromCours/g)]).toHaveLength(3);
  });
  it("does not call full-block reconstruction on a module save", () => {
    const trigger = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.trg_sync_bilans_from_cours()"));
    expect(trigger).toContain("RETURN NEW;");
    expect(trigger).not.toMatch(/PERFORM\s+.*sync_bilan_from_cours/i);
  });
  it("preserves unchanged question metadata and target activation", () => {
    expect(migration).toContain("WHEN q.question IS NOT DISTINCT FROM oldq.old_question_value THEN q.question");
    expect(migration).toContain("THEN nq.q ELSE tq.q END");
    expect(migration).toContain("jsonb_build_object('actif',v_exo->'actif')");
  });
});