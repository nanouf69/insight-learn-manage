/**
 * Q13 EB4 VTC/VA : aucune écriture sans référence serveur vérifiée,
 * aucune date locale, une tentative obsolète ne peut pas écraser une plus récente.
 * Serveur simulé reproduisant la règle CAS de save_module_editor_state (lue en base, lecture seule).
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

const db = vi.hoisted(() => ({ rows: new Map<number, { module_data: any; updated_at: string }>(), clock: Date.parse("2026-11-12T09:47:00Z"), rpcCalls: 0 }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (_: string, a: any) => {
      db.rpcCalls++;
      const cur = db.rows.get(a.p_module_id);
      if (cur && JSON.stringify(cur.module_data) === JSON.stringify(a.p_module_data)) return { data: [{ updated_at: cur.updated_at }], error: null };
      if (cur && a.p_expected_updated_at !== null && Date.parse(cur.updated_at) > Date.parse(a.p_expected_updated_at) + 1)
        return { data: null, error: { code: "P0409", message: "stale_module_editor_state_write" } };
      db.clock += 1000;
      const updated_at = new Date(db.clock).toISOString();
      db.rows.set(a.p_module_id, { module_data: a.p_module_data, updated_at });
      return { data: [{ updated_at }], error: null };
    },
    from: () => ({ select: () => ({ eq: (_: string, id: number) => ({ maybeSingle: async () => ({ data: db.rows.get(id) ?? null, error: null }) }) }) }),
  },
}));
import { saveExamModuleWithCas, ReferenceServeurNonVerifieeError } from "@/components/cours-en-ligne/ExamensBlancsEditor";

const contenu = (b: string) => ({ id: "EB4", matieres: [{ id: "fv", questions: [{ id: 13, choix: [{ lettre: "B", texte: b }] }] }] });
const M = 90004;
beforeEach(() => { db.rows.clear(); db.rpcCalls = 0; db.rows.set(M, { module_data: contenu("coût de revient + marge + TVA coût de revient + marge + TVA"), updated_at: "2026-11-12T09:00:00.000Z" }); });

describe("CAS éditeur Examens Blancs", () => {
  it("référence non vérifiée : refus AVANT tout appel serveur, contenu serveur intact", async () => {
    await expect(saveExamModuleWithCas({ moduleId: M, moduleData: contenu("x"), expectedUpdatedAt: undefined })).rejects.toBeInstanceOf(ReferenceServeurNonVerifieeError);
    expect(db.rpcCalls).toBe(0);
    expect(db.rows.get(M)!.module_data.matieres[0].questions[0].choix[0].texte).toMatch(/TVA coût/);
  });
  it("une sauvegarde suffit ; deux onglets : l'obsolète est refusée, la récente reste après relecture et 10 min", async () => {
    const refA = db.rows.get(M)!.updated_at, refB = refA;
    const nouvelleRef = await saveExamModuleWithCas({ moduleId: M, moduleData: contenu("coût de revient + marge + TVA"), expectedUpdatedAt: refA });
    expect(nouvelleRef).toBe(db.rows.get(M)!.updated_at);
    await expect(saveExamModuleWithCas({ moduleId: M, moduleData: contenu("ancienne doublée"), expectedUpdatedAt: refB })).rejects.toMatchObject({ code: "P0409" });
    db.clock += 10 * 60_000;
    expect(db.rows.get(M)!.module_data.matieres[0].questions[0].choix[0].texte).toBe("coût de revient + marge + TVA");
    // L'onglet à jour peut continuer avec la référence relue.
    await saveExamModuleWithCas({ moduleId: M, moduleData: contenu("coût de revient + marge + TVA "), expectedUpdatedAt: nouvelleRef });
  });
  it("création seulement si l'absence est vérifiée (null)", async () => {
    await saveExamModuleWithCas({ moduleId: 90099, moduleData: contenu("neuf"), expectedUpdatedAt: null });
    expect(db.rows.has(90099)).toBe(true);
  });
  it("l'éditeur ne relit plus updated_at séparément du contenu et n'utilise jamais de date locale comme référence", () => {
    const src = readFileSync("src/components/cours-en-ligne/ExamensBlancsEditor.tsx", "utf8");
    expect(src).not.toMatch(/select\("module_id, updated_at"\)/);
    expect(src).not.toMatch(/\?\? now;/);
    expect(src).not.toMatch(/fallbackSavedAt/);
  });
});
