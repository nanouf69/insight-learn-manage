/**
 * TDD — BUG #3: Token refresh pendant les examens
 *
 * CONSTAT après analyse: le hook useSessionKeepAlive est DÉJÀ correctement implémenté.
 * Le check `if (!forceAlways)` (ligne 28) bypass bien l'idle check en mode examen.
 *
 * Ces tests vérifient que le comportement reste correct et ne régresse pas.
 * Ils testent le VRAI hook importé depuis @/hooks/useSessionKeepAlive.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockRefreshSession = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      refreshSession: mockRefreshSession,
    },
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("BUG #3 — Token refresh pendant les examens (non-regression)", () => {
  it("devrait refresher toutes les 10 min en mode examen (forceAlways=true)", async () => {
    const { useSessionKeepAlive } = await import("@/hooks/useSessionKeepAlive");
    renderHook(() => useSessionKeepAlive(true, true));

    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(mockRefreshSession).toHaveBeenCalledTimes(2);
  });

  it("devrait refresher MÊME après 20 min sans interaction en mode examen", async () => {
    const { useSessionKeepAlive } = await import("@/hooks/useSessionKeepAlive");
    renderHook(() => useSessionKeepAlive(true, true));

    // 20 min sans aucun événement user → le hook doit quand même refresher
    await act(async () => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });
    expect(mockRefreshSession).toHaveBeenCalledTimes(2);
  });

  it("devrait skipper le refresh après 15 min d'inactivité en mode NORMAL", async () => {
    const { useSessionKeepAlive } = await import("@/hooks/useSessionKeepAlive");
    renderHook(() => useSessionKeepAlive(true, false));

    // 10 min: encore actif (< 15 min idle window) → refresh
    // 20 min: idle depuis 20 min (> 15 min) → skip
    await act(async () => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("ne devrait rien faire quand enabled=false", async () => {
    const { useSessionKeepAlive } = await import("@/hooks/useSessionKeepAlive");
    renderHook(() => useSessionKeepAlive(false, true));

    await act(async () => {
      vi.advanceTimersByTime(30 * 60 * 1000);
    });
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it("devrait logger un warning en cas d'échec du refresh", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockRefreshSession.mockResolvedValueOnce({ error: { message: "Token expired" } });

    const { useSessionKeepAlive } = await import("@/hooks/useSessionKeepAlive");
    renderHook(() => useSessionKeepAlive(true, true));

    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });

    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining("[KeepAlive]"),
      expect.stringContaining("Token expired")
    );
    consoleWarn.mockRestore();
  });

  it("devrait cleanup les listeners et l'interval au unmount", async () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { useSessionKeepAlive } = await import("@/hooks/useSessionKeepAlive");

    const { unmount } = renderHook(() => useSessionKeepAlive(true, true));
    unmount();

    const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain("mousemove");
    expect(removedEvents).toContain("keydown");
    removeSpy.mockRestore();
  });
});
