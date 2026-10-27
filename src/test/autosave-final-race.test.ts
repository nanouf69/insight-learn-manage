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
