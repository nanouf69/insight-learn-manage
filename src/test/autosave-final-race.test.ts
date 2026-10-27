/**
 * Non-régression : un brouillon arrivé après la validation finale ne doit jamais
 * remplacer la version validée (_status: "completed").
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const upserts: any[] = [];
let releaseFirst: (() => void) | null = null;
let blockNext = false;

vi.mock("@/lib/sessionExpiree", () => ({ assurerSessionFraiche: vi.fn(async () => {}) }));
vi.mock("@/lib/sessionRpc", () => ({ bounded: (p: any) => p }));
vi.mock("@/lib/savePublicFormDocument", () => ({ savePublicFormDocument: vi.fn(async () => true) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u-fictif" } } })) },
    from: vi.fn(() => ({
      upsert: vi.fn((row: any) => {
        if (blockNext) {
          blockNext = false;
          return new Promise((resolve) => {
            releaseFirst = () => { upserts.push(row.donnees); resolve({ error: null }); };
          });
        }
        upserts.push(row.donnees);
        return Promise.resolve({ error: null });
      }),
    })),
  },
}));

import { useAutoSave } from "@/hooks/useAutoSave";

const params = { apprenantId: "a-fictif", typeDocument: "analyse-besoin", titre: "T", interval: 30000 };

describe("course brouillon / validation", () => {
  beforeEach(() => { upserts.length = 0; localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("un brouillon en file et les minuteurs ne réécrivent pas après validation", async () => {
    const { result } = renderHook(() => useAutoSave(params));
    act(() => result.current.queueSave({ nom: "brouillon" }));
    let ok = false;
    await act(async () => { ok = await result.current.triggerSave({ nom: "final", _status: "completed" }); });
    expect(ok).toBe(true);
    act(() => result.current.queueSave({ nom: "tardif" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(65000); });
    expect(upserts.at(-1)).toEqual({ nom: "final", _status: "completed" });
    expect(upserts.filter((d) => d._status !== "completed")).toHaveLength(0);
  });

  it("brouillon en vol : la validation attend puis passe en dernier, sans faux échec", async () => {
    const { result } = renderHook(() => useAutoSave(params));
    blockNext = true;
    let draftDone: Promise<boolean> | undefined;
    act(() => { draftDone = result.current.triggerSave({ nom: "brouillon" }); });
    let finalP: Promise<boolean> | undefined;
    act(() => { finalP = result.current.triggerSave({ nom: "final", _status: "completed" }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); releaseFirst?.(); await draftDone; await vi.advanceTimersByTimeAsync(200); });
    expect(await finalP).toBe(true);
    expect(upserts.at(-1)).toEqual({ nom: "final", _status: "completed" });
  });
});

describe("validation normale et échec réel", () => {
  beforeEach(() => { upserts.length = 0; localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it("validation normale : un seul envoi, statut validé", async () => {
    const { result } = renderHook(() => useAutoSave(params));
    let ok = false;
    await act(async () => { ok = await result.current.triggerSave({ nom: "x", _status: "completed" }); });
    expect(ok).toBe(true);
    expect(upserts).toEqual([{ nom: "x", _status: "completed" }]);
  });
  it("échec réel : renvoie false, aucun brouillon ensuite, la version validée est réessayée", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { savePublicFormDocument } = await import("@/lib/savePublicFormDocument");
    const fail = { upsert: vi.fn(() => Promise.resolve({ error: { message: "réseau" } })) };
    (supabase.from as any).mockImplementation(() => fail);
    (savePublicFormDocument as any).mockResolvedValueOnce(false);
    const { result } = renderHook(() => useAutoSave(params));
    let ok = true;
    await act(async () => { const p = result.current.triggerSave({ nom: "final", _status: "completed" }); await vi.advanceTimersByTimeAsync(10000); ok = await p; });
    expect(ok).toBe(false);
    const sent: any[] = [];
    (supabase.from as any).mockImplementation(() => ({ upsert: vi.fn((row: any) => { sent.push(row.donnees); return Promise.resolve({ error: null }); }) }));
    act(() => result.current.queueSave({ nom: "brouillon" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(31000); });
    expect(sent.every((d) => d._status === "completed")).toBe(true);
    expect(sent.length).toBeGreaterThan(0);
  });
});

describe("compléments : correction après échec, identité, double validation", () => {
  beforeEach(async () => {
    upserts.length = 0; localStorage.clear(); vi.useFakeTimers();
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as any).mockImplementation(() => ({ upsert: vi.fn((row: any) => { upserts.push({ id: row.apprenant_id, d: row.donnees }); return Promise.resolve({ error: null }); }) }));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("échec puis nouvelle validation corrigée : la dernière version de l'élève gagne", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { savePublicFormDocument } = await import("@/lib/savePublicFormDocument");
    const ok = (supabase.from as any).getMockImplementation();
    (supabase.from as any).mockImplementation(() => ({ upsert: vi.fn(() => Promise.resolve({ error: { message: "réseau" } })) }));
    (savePublicFormDocument as any).mockResolvedValue(false);
    const { result } = renderHook(() => useAutoSave(params));
    let r1 = true;
    await act(async () => { const p = result.current.triggerSave({ choix: "ancien", _status: "completed" }); await vi.advanceTimersByTimeAsync(10000); r1 = await p; });
    expect(r1).toBe(false);
    (supabase.from as any).mockImplementation(ok);
    (savePublicFormDocument as any).mockResolvedValue(true);
    let r2 = false;
    await act(async () => { r2 = await result.current.triggerSave({ choix: "nouveau", _status: "completed" }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(65000); });
    expect(r2).toBe(true);
    expect(upserts.at(-1).d.choix).toBe("nouveau");
    expect(upserts.some((u) => u.d.choix === "ancien")).toBe(false);
  });

  it("changement d'élève pendant l'attente : aucune écriture croisée", async () => {
    const { result, rerender } = renderHook((p: any) => useAutoSave(p), { initialProps: params });
    act(() => result.current.queueSave({ nom: "de A" }));
    rerender({ ...params, apprenantId: "b-fictif" });
    await act(async () => { await vi.advanceTimersByTimeAsync(65000); });
    expect(upserts.filter((u) => u.id === "b-fictif" && u.d.nom === "de A")).toHaveLength(0);
  });

  it("double validation : statut validé conservé, dernière valeur seule", async () => {
    const { result } = renderHook(() => useAutoSave(params));
    let a = false, b = false;
    await act(async () => {
      const p1 = result.current.triggerSave({ nom: "v1", _status: "completed" });
      const p2 = result.current.triggerSave({ nom: "v2", _status: "completed" });
      await vi.advanceTimersByTimeAsync(5000);
      [a, b] = await Promise.all([p1, p2]);
    });
    expect(a && b).toBe(true);
    expect(upserts.every((u) => u.d._status === "completed")).toBe(true);
    expect(upserts.at(-1).d.nom).toBe("v2");
  });
});

describe("rechargement et identité après attente", () => {
  beforeEach(async () => {
    upserts.length = 0; localStorage.clear(); vi.useFakeTimers();
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as any).mockImplementation(() => ({
      upsert: vi.fn((row: any) => { upserts.push({ id: row.apprenant_id, t: row.type_document, d: row.donnees }); return Promise.resolve({ error: null }); }),
      select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [{ donnees: { nom: "final", _status: "completed" } }], error: null }) }) }) }) }),
    }));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("brouillon puis validation réussie, remontage : restaure la version validée, jamais l'ancien brouillon", async () => {
    const { loadDraftFromSupabase, loadSavedDraft } = await import("@/hooks/useAutoSave");
    const h = renderHook(() => useAutoSave(params));
    act(() => h.result.current.queueSave({ nom: "brouillon" }));
    await act(async () => { await h.result.current.triggerSave({ nom: "final", _status: "completed" }); });
    h.unmount();
    renderHook(() => useAutoSave(params));
    expect(loadSavedDraft("a-fictif", "analyse-besoin")?.nom).toBe("final");
    const d = await loadDraftFromSupabase("a-fictif", "analyse-besoin");
    expect(d?._status).toBe("completed");
    expect(d?.nom).toBe("final");
  });

  it("validation en attente d'un brouillon puis changement d'élève : rien n'est écrit", async () => {
    const h = renderHook((p: any) => useAutoSave(p), { initialProps: params });
    blockNext = true;
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as any).mockImplementation(() => ({ upsert: vi.fn((row: any) => new Promise((res) => {
      releaseFirst = () => { upserts.push({ id: row.apprenant_id, d: row.donnees }); res({ error: null }); };
    })) }));
    let draftP: any, finalP: any;
    act(() => { draftP = h.result.current.triggerSave({ nom: "brouillon" }); });
    act(() => { finalP = h.result.current.triggerSave({ nom: "final", _status: "completed" }); });
    h.rerender({ ...params, apprenantId: "b-fictif" });
    let r: any;
    await act(async () => { await vi.advanceTimersByTimeAsync(20); releaseFirst?.(); await vi.advanceTimersByTimeAsync(20000); await draftP; r = await finalP; });
    expect(r).toBe(false);
    expect(upserts.filter((u) => u.d._status === "completed")).toHaveLength(0);
  });
});
