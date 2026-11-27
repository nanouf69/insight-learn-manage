import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

describe("attestation fin de formation e-learning", () => {
  it("jalons illisibles : export interrompu, aucun document", async () => {
    vi.doMock("@/lib/jalonsPedagogiques", async (o) => ({ ...(await o() as any), chargerCalculJalons: async () => { throw new Error("sync"); } }));
    vi.doMock("@/lib/releveJalonsGel", async (o) => ({ ...(await o() as any), chargerEtatGel: async () => ({ etat: "vivant" }) }));
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    vi.doMock("@/lib/documentAdminElements", async (o) => ({ ...(await o() as any), chargerElementAdmin: async () => png }));
    const m = await import("@/lib/pdf/attestation-fin-formation");
    await expect(m.generateAttestationFinFormation({ id: "a", nom: "X", prenom: "Y", type_apprenant: "vtc-e", formation_choisie: "vtc-e" } as any, [], [], [] as any, { returnBlob: true } as any))
      .rejects.toBeInstanceOf(m.AttestationJalonsIndisponibles);
  });
});

describe("signOut partagé", () => {
  it("échec : état conservé, false renvoyé", async () => {
    vi.resetModules();
    const signOut = vi.fn(async () => ({ error: { message: "réseau" } }));
    vi.doMock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut } } }));
    const src = readFileSync("src/contexts/AuthContext.tsx", "utf8");
    expect(src).toMatch(/if \(error\) \{ manualSignOutRef\.current = false; return false; \}/);
    expect(readFileSync("src/components/layout/Sidebar.tsx", "utf8")).toMatch(/if \(!\(await signOut\(\)\)\) toast\.error/);
  });
});
