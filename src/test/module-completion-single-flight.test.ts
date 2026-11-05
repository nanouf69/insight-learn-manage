import { describe, it, expect, vi, beforeEach } from "vitest";
const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
vi.mock("@/lib/learnerPreviewGuard", () => ({ blockLearnerWrite: () => false }), );
import { saveModuleCompletion, delaiNouvelEssai } from "@/lib/moduleCompletion";

describe("Enregistrement de module : single-flight et gigue", () => {
  beforeEach(() => rpc.mockReset());
  it("deux envois identiques simultanés = un seul appel serveur", async () => {
    let resoudre!: (v: unknown) => void;
    rpc.mockReturnValue(new Promise((r) => (resoudre = r)));
    const p = { apprenantId: "a", moduleId: 2, completed: false, progress: 40, details: [{ q: 1 }] };
    const a = saveModuleCompletion(p), b = saveModuleCompletion({ ...p, details: [{ q: 1 }] });
    resoudre({ error: null });
    expect(await a).toBe(true); expect(await b).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("envois différents = appels distincts (aucune réponse plus récente perdue)", async () => {
    rpc.mockResolvedValue({ error: null });
    await Promise.all([
      saveModuleCompletion({ apprenantId: "a", moduleId: 2, completed: false, progress: 40 }),
      saveModuleCompletion({ apprenantId: "a", moduleId: 2, completed: false, progress: 50 }),
    ]);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
  it("après la fin, un nouvel envoi identique repart au serveur", async () => {
    rpc.mockResolvedValue({ error: null });
    const p = { apprenantId: "a", moduleId: 4, completed: true, progress: 100 };
    await saveModuleCompletion(p); await saveModuleCompletion(p);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
  it("gigue bornée 0,5×–1,5× du délai de base", () => {
    expect(delaiNouvelEssai(1, 0)).toBe(400);
    expect(delaiNouvelEssai(2, 1)).toBe(2400);
  });
});
