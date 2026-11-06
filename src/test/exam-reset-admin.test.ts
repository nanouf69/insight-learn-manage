// @vitest-environment node
import { readFileSync } from "fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ appels: [] as any[], erreur: null as null | { message: string } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (nom: string, params: any) => {
      h.appels.push({ nom, params });
      return h.erreur
        ? { data: null, error: h.erreur }
        : { data: { reset_id: `reset-${params.p_exam_id}` }, error: null };
    },
  },
}));

import { archiverExamenBlancAdmin, idsResultatsLegacyArchives } from "@/lib/examResetAdmin";

beforeEach(() => { h.appels = []; h.erreur = null; });

describe("reset admin — archivage fictif, jamais de suppression", () => {
  it("utilise uniquement la procédure officielle pour chaque examen", async () => {
    await expect(archiverExamenBlancAdmin({
      apprenantId: "a-fictif",
      examIds: ["EB1-FICTIF", "EB1-FICTIF", "EB2-FICTIF"],
      motif: "test",
      adminEmail: "admin@example.test",
    })).resolves.toEqual(["reset-EB1-FICTIF", "reset-EB2-FICTIF"]);
    expect(h.appels.map((a) => a.nom)).toEqual(["core_admin_reset_exam", "core_admin_reset_exam"]);
    expect(h.appels.map((a) => a.params.p_exam_id)).toEqual(["EB1-FICTIF", "EB2-FICTIF"]);
    expect(new Set(h.appels.map((a) => a.params.p_operation_id)).size).toBe(2);
  });

  it("un refus serveur est remonté et ne produit aucun faux succès", async () => {
    h.erreur = { message: "refus fictif" };
    await expect(archiverExamenBlancAdmin({ apprenantId: "a", examIds: ["EB1"], motif: "test" })).rejects.toThrow("refus fictif");
  });

  it("seuls les IDs archivés sont masqués de l'affichage", () => {
    expect(idsResultatsLegacyArchives([
      { archived_legacy_result_ids: ["ancien-1", "ancien-2"] },
      { archived_legacy_result_ids: [] },
      { archived_legacy_result_ids: null },
    ])).toEqual(new Set(["ancien-1", "ancien-2"]));
  });

  it("l'écran admin ne contient plus de suppression directe", () => {
    const source = readFileSync("src/components/crm/apprenant-sections/ExamensBlancsResetTab.tsx", "utf8");
    expect(source).not.toContain(".delete(");
    expect(source).toContain("archiverExamenBlancAdmin");
  });
});
