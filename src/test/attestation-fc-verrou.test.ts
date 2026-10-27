import { describe, it, expect, vi, beforeEach } from "vitest";
const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
import { controlerAttestationFC, messageRefusAttestationFC } from "@/lib/attestationFcVerrou";

describe("Verrou attestation FC (côté écran)", () => {
  beforeEach(() => rpc.mockReset());
  it("3/4 signatures : refus avec créneau manquant nommé", async () => {
    rpc.mockResolvedValue({ data: { autorise: false, requis: 4, signes: 3, manquants: [{ date: "2026-07-22", creneau: "apres_midi" }] }, error: null });
    const c = await controlerAttestationFC("a");
    expect(c.autorise).toBe(false);
    expect(messageRefusAttestationFC(c)).toBe("Attestation bloquée : 3/4 émargements signés. Manquant : 22/07/2026 après-midi.");
  });
  it("4/4 : autorisé", async () => {
    rpc.mockResolvedValue({ data: { autorise: true, requis: 4, signes: 4, manquants: [] }, error: null });
    expect((await controlerAttestationFC("a")).autorise).toBe(true);
  });
  it("erreur serveur : refus par défaut", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    expect((await controlerAttestationFC("a")).autorise).toBe(false);
  });
  it("erreur réseau : refus par défaut", async () => {
    rpc.mockImplementation(() => { throw new TypeError("réseau"); });
    expect((await controlerAttestationFC("a")).autorise).toBe(false);
  });
  it("sans apprenant : refus sans appel", async () => {
    expect((await controlerAttestationFC(null)).autorise).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
