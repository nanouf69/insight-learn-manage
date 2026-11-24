import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCrmDossierRefresh } from "@/hooks/useCrmDossierRefresh";

const h = vi.hoisted(() => ({
  events: [] as { filter: Record<string, string>; callback: () => void }[],
  statuses: [] as ((status: string) => void)[],
  remove: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  channel: () => {
    const channel = {
      on: (_type: string, filter: Record<string, string>, callback: () => void) => {
        h.events.push({ filter, callback }); return channel;
      },
      subscribe: (callback: (status: string) => void) => { h.statuses.push(callback); return channel; },
    };
    return channel;
  },
  removeChannel: h.remove,
} }));

let client: QueryClient;
beforeEach(() => {
  vi.useFakeTimers(); h.events = []; h.statuses = []; h.remove.mockClear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  for (const key of [["apprenant-detail", "a"], ["choix-pratique-crm", "a"],
    ["apprenant-bilan-signatures-edof", "a", "vtc"], ["apprenant-detail", "b"], ["apprenants-crm"]]) {
    client.setQueryData(key, { recorded: true });
  }
});
afterEach(() => { cleanup(); client.clear(); vi.useRealTimers(); });
function mount(id = "a") {
  return renderHook(({ learner }) => useCrmDossierRefresh(learner), {
    initialProps: { learner: id },
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}
describe("CRM dossier refresh", () => {
  it("updates the other indicators after a confirmed panel invalidation, not another learner", () => {
    mount();
    act(() => { void client.invalidateQueries({ queryKey: ["choix-pratique-crm", "a"] }); });
    expect(client.getQueryState(["apprenant-detail", "a"])?.isInvalidated).toBe(false);
    act(() => vi.advanceTimersByTime(300));
    expect(client.getQueryState(["apprenant-detail", "a"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["apprenant-bilan-signatures-edof", "a", "vtc"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["apprenants-crm"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["apprenant-detail", "b"])?.isInvalidated).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("subscribes only to published small tables with the learner filter and coalesces bursts", () => {
    mount();
    expect(h.events).toHaveLength(6);
    expect(h.events.every(({ filter }) => filter.filter === "apprenant_id=eq.a")).toBe(true);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    act(() => { h.events.forEach(({ callback }) => callback()); vi.advanceTimersByTime(299); });
    expect(invalidate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(invalidate).toHaveBeenCalledTimes(4);
    act(() => vi.advanceTimersByTime(60_000));
    expect(invalidate).toHaveBeenCalledTimes(4);
  });
  it("catches reconnect and resume but skips the initial subscription with fresh data", () => {
    mount(); const invalidate = vi.spyOn(client, "invalidateQueries");
    act(() => { h.statuses[0]("SUBSCRIBED"); vi.advanceTimersByTime(300); });
    expect(invalidate).not.toHaveBeenCalled();
    act(() => {
      h.statuses[0]("SUBSCRIBED"); window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online")); vi.advanceTimersByTime(300);
    });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
  it("ignores callbacks from the old dossier and cleans timers and listeners", () => {
    const { rerender, unmount } = mount(); const old = h.events[0].callback;
    act(() => old()); rerender({ learner: "b" });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    act(() => { old(); vi.advanceTimersByTime(300); });
    expect(invalidate).not.toHaveBeenCalled();
    unmount();
    act(() => { window.dispatchEvent(new Event("focus")); vi.advanceTimersByTime(300); });
    expect(invalidate).not.toHaveBeenCalled();
    expect(h.remove).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not refresh after a refused save, only success for the same learner", async () => {
    mount(); const invalidate = vi.spyOn(client, "invalidateQueries");
    const failed = client.getMutationCache().build(client, {
      mutationFn: async (_variables: { apprenantId: string }) => { throw new Error("refused"); }, retry: false,
    });
    await act(async () => { await failed.execute({ apprenantId: "a" }).catch(() => undefined); });
    act(() => vi.advanceTimersByTime(300)); expect(invalidate).not.toHaveBeenCalled();
    const successful = client.getMutationCache().build(client, {
      mutationFn: async (variables: { apprenantId: string }) => variables,
    });
    await act(async () => { await successful.execute({ apprenantId: "b" }); });
    act(() => vi.advanceTimersByTime(300)); expect(invalidate).not.toHaveBeenCalled();
    await act(async () => { await successful.execute({ apprenantId: "a" }); });
    act(() => vi.advanceTimersByTime(300));
    expect(client.getQueryState(["apprenant-detail", "a"])?.isInvalidated).toBe(true);
  });
});