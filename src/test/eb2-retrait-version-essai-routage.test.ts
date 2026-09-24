import { describe, it, expect, vi, beforeEach } from "vitest";

// Données 100 % fictives : aucun vrai apprenant, aucun accès réseau.
const etat = { pont: true, versionsActives: [] as { id: string }[], rpcDemarrage: vi.fn() };

vi.mock("@/integrations/supabase/client", () => {
  const chain: any = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.is = () => chain;
  chain.limit = () => Promise.resolve({ data: etat.versionsActives, error: null });
  return {
    supabase: {
      from: () => chain,
      rpc: (nom: string, args: unknown) => {
        if (nom === "core_bridge_actif_pour") return Promise.resolve({ data: etat.pont, error: null });
        etat.rpcDemarrage(nom, args);
        return Promise.resolve({ data: null, error: { message: "ne doit pas être appelé" } });
      },
    },
  };
});

import { routerPassage } from "@/features/noyau-passage/pontV2";

const params = {
  apprenantId: "00000000-0000-0000-0000-00000000f1c7",
  examenId: "EB2",
  matiereId: "gv",
  tentative: 1,
  passageDejaEngage: false,
};

describe("EB2 après retrait de la version d'essai vide (fictif)", () => {
  beforeEach(() => { etat.pont = true; etat.versionsActives = []; etat.rpcDemarrage.mockReset(); });

  it("sans version active, EB2 part sur l'ancien circuit sans ouvrir de tentative V2", async () => {
    const d = await routerPassage(params);
    expect(d).toEqual({ moteur: "ancien", motif: "sujet_non_publie" });
    expect(etat.rpcDemarrage).not.toHaveBeenCalled();
  });

  it("un élève fictif ayant déjà un passage V2 terminé ne bascule pas de moteur (ancien circuit)", async () => {
    const d = await routerPassage({ ...params, passageDejaEngage: true });
    expect(d.moteur).toBe("ancien");
    expect(etat.rpcDemarrage).not.toHaveBeenCalled();
  });
});
