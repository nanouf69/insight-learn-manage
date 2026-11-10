import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAlertesNotesGlobales } from "@/features/surveillance-examens/useAlertesNotesGlobales";

const h = vi.hoisted(() => ({ read: vi.fn(), events: [] as (() => void)[], tables: [] as string[], remove: vi.fn() }));
vi.mock("@/features/surveillance-examens/lectureNotesGlobales", () => ({ lireObservationsNotesGlobales: h.read }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  channel: () => { const c = { on: (_: unknown, filter: any, cb: () => void) => { h.events.push(cb); h.tables.push(filter.table); return c; }, subscribe: () => c }; return c; }, removeChannel: h.remove,
} }));
const missing = { cle: "a:EB2:T1", signature: "missing", prete: true, publiee: false, matieres: [] };
beforeEach(() => { vi.useFakeTimers(); h.read.mockReset(); h.events = []; h.tables = []; h.remove.mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
describe("surveillance globale événementielle bornée", () => {
  it("une seconde lecture à 5 s confirme, puis aucun polling et date stable", async () => {
    h.read.mockResolvedValue([missing]);
    const { result } = renderHook(() => useAlertesNotesGlobales());
    await advance(0); expect(result.current.alertes).toHaveLength(0);
    await advance(5000); expect(result.current.alertes).toHaveLength(1);
    const heure = result.current.alertes[0].heure;
    await advance(60000); expect(h.read).toHaveBeenCalledTimes(2);
    act(() => { h.events[0](); h.events[1](); h.events[2](); });
    await advance(400); expect(h.read).toHaveBeenCalledTimes(3);
    expect(result.current.alertes[0].heure).toBe(heure);
  });
  it("résultat revenu via événement serveur : résolution sans écriture", async () => {
    h.read.mockResolvedValue([missing]); const { result } = renderHook(() => useAlertesNotesGlobales());
    await advance(5000); expect(result.current.alertes).toHaveLength(1);
    h.read.mockResolvedValue([{ ...missing, publiee: true }]);
    act(() => h.events[h.tables.indexOf("core_exam_results")]());
    await advance(400); expect(result.current.alertes).toHaveLength(0);
  });
  it("échec de lecture ne résout pas une alerte et ne boucle pas", async () => {
    h.read.mockResolvedValue([missing]); const { result } = renderHook(() => useAlertesNotesGlobales());
    await advance(5000); h.read.mockRejectedValue(new Error("offline"));
    act(() => h.events[0]()); await advance(400);
    expect(result.current.alertes).toHaveLength(1); expect(result.current.erreur).toBeTruthy();
    const count = h.read.mock.calls.length; await advance(60000); expect(h.read).toHaveBeenCalledTimes(count);
  });
  it("changement de tentative et démontage : pas de confirmation héritée", async () => {
    h.read.mockResolvedValue([missing]); const { result, unmount } = renderHook(() => useAlertesNotesGlobales());
    await advance(0); h.read.mockResolvedValue([{ ...missing, cle: "a:EB2:T2", signature: "new" }]);
    await advance(5000); expect(result.current.alertes).toHaveLength(0);
    unmount(); expect(h.remove).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
});