/**
 * Test — Force disconnect then reconnect on the new device.
 *
 * Scenario:
 * 1. `start_apprenant_connexion` first returns an `already_connected` error → hook sets `alreadyConnected = true`.
 * 2. User clicks "Forcer la déconnexion" → `forceDisconnectOthers()` closes other sessions and bumps `retry`.
 * 3. The effect re-runs `start_apprenant_connexion` which now succeeds → hook exposes a fresh `connexionId`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const APPRENANT_ID = "app-1";
const USER_ID = "user-1";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
  },
}));

// Chainable builder that resolves to a given result when awaited.
function makeChain(finalResult: any) {
  const chain: any = {};
  const methods = ["update", "insert", "select", "eq", "neq", "is", "maybeSingle"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.then = (resolve: any) => Promise.resolve(finalResult).then(resolve);
  return chain;
}

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
  // fetch (ipify) shouldn't affect the test; make it fail fast.
  (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error("no net"));
  // Stub crypto.randomUUID for stable client_session_id.
  (globalThis as any).crypto = { randomUUID: () => "client-session-xyz" };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Force disconnect → reconnect on new device", () => {
  it("relaunches the connexion after forceDisconnectOthers and exposes a new connexionId", async () => {
    // 1st start = already connected, 2nd start = success
    rpcMock.mockImplementation((fnName: string) => {
      if (fnName === "start_apprenant_connexion") {
        const call = rpcMock.mock.calls.filter(
          ([n]) => n === "start_apprenant_connexion",
        ).length;
        if (call === 1) {
          return Promise.resolve({ data: null, error: { message: "already_connected" } });
        }
        return Promise.resolve({ data: [{ id: "new-connexion-id" }], error: null });
      }
      if (fnName === "get_active_apprenant_connexion_info") {
        return Promise.resolve({
          data: [{
            ip_address: "1.2.3.4",
            user_agent: "OtherDevice",
            started_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            source: "cours",
          }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // `from(...)` chains — return successful no-ops.
    fromMock.mockImplementation((table: string) => {
      if (table === "apprenants") {
        return makeChain({ data: { nom: "Doe", prenom: "John", formation_choisie: "VTC", type_apprenant: "vtc" }, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const { useConnexionTracking } = await import("@/hooks/useConnexionTracking");

    const { result } = renderHook(() =>
      useConnexionTracking({ apprenantId: APPRENANT_ID, userId: USER_ID, enabled: true }),
    );

    // Wait for the first start to resolve → alreadyConnected true.
    await waitFor(() => {
      expect(result.current.alreadyConnected).toBe(true);
    });
    expect(result.current.connexionId).toBeNull();

    // User clicks "Forcer la déconnexion".
    await act(async () => {
      await result.current.forceDisconnectOthers();
    });

    // The hook must relaunch the connexion and expose the new id.
    await waitFor(() => {
      expect(result.current.connexionId).toBe("new-connexion-id");
    });
    expect(result.current.alreadyConnected).toBe(false);

    // Verify the update to close other sessions was scoped correctly.
    const connexionsCalls = fromMock.mock.calls.filter(
      ([t]) => t === "apprenant_connexions",
    );
    expect(connexionsCalls.length).toBeGreaterThan(0);

    // start_apprenant_connexion called exactly twice (initial + after retry).
    const startCalls = rpcMock.mock.calls.filter(
      ([n]) => n === "start_apprenant_connexion",
    );
    expect(startCalls.length).toBe(2);
  });

  it("does nothing when apprenantId is null", async () => {
    const { useConnexionTracking } = await import("@/hooks/useConnexionTracking");
    const { result } = renderHook(() =>
      useConnexionTracking({ apprenantId: null, userId: USER_ID, enabled: true }),
    );
    await act(async () => {
      await result.current.forceDisconnectOthers();
    });
    expect(fromMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
