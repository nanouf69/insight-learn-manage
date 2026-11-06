// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  reponsesRpc: [] as any[],
  etats: {} as Record<string, string | undefined>,
  erreursEtats: {} as Record<string, string | undefined>,
  neutralisees: new Set<string>(),
  erreurNeutralisation: null as string | null,
  operations: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async (_nom: string, params: any) => {
      h.operations.push(String(params.p_operation_id));
      return h.reponsesRpc.shift() ?? { data: null, error: { message: "réponse fictive absente" } };
    }),
    from: (table: string) => {
      const b: any = {
        id: "",
        select: () => b,
        eq: (_colonne: string, valeur: string) => { b.id = valeur; return b; },
        maybeSingle: async () => {
          if (table === "core_tentatives_neutralisees") {
            return h.erreurNeutralisation
              ? { data: null, error: { message: h.erreurNeutralisation } }
              : { data: h.neutralisees.has(b.id) ? { attempt_id: b.id } : null, error: null };
          }
          const erreur = h.erreursEtats[b.id];
          return erreur
            ? { data: null, error: { message: erreur } }
            : { data: h.etats[b.id] ? { etat: h.etats[b.id] } : null, error: null };
        },
      };
      return b;
    },
  },
}));

import { demarrerTentative } from "@/features/noyau-passage/pontV2";

const params = { apprenantId: "a-fictif", examenId: "EB1-FICTIF", matiereId: "t3p", tentative: 1 };
const reponse = (attemptId: string) => ({ data: { attempt_id: attemptId }, error: null });

beforeEach(() => {
  h.reponsesRpc = [];
  h.etats = {};
  h.erreursEtats = {};
  h.neutralisees = new Set();
  h.erreurNeutralisation = null;
  h.operations = [];
});

describe("ouverture V2 après remise à zéro — faux serveur, aucune donnée réelle", () => {
  it.each(["abandonnee", "terminee"])("un rejeu %s crée et revalide une nouvelle tentative ouverte", async (etat) => {
    h.etats = { ancienne: etat, nouvelle: "en_cours" };
    h.reponsesRpc = [reponse("ancienne"), reponse("nouvelle")];

    await expect(demarrerTentative(params)).resolves.toBe("nouvelle");
    expect(h.operations).toHaveLength(2);
    expect(h.operations[1]).not.toBe(h.operations[0]);
  });

  it("une tentative terminée neutralisée exige aussi un autre ID réellement ouvert", async () => {
    h.etats = { ancienne: "terminee", nouvelle: "en_cours" };
    h.neutralisees = new Set(["ancienne"]);
    h.reponsesRpc = [reponse("ancienne"), reponse("nouvelle")];

    await expect(demarrerTentative(params)).resolves.toBe("nouvelle");
    expect(h.operations).toHaveLength(2);
  });

  it("une erreur de lecture d'état ne renvoie jamais l'ancien ID fermé", async () => {
    h.etats = { ancienne: "abandonnee" };
    h.erreursEtats = { ancienne: "panne fictive" };
    h.reponsesRpc = [reponse("ancienne")];

    await expect(demarrerTentative(params)).resolves.toBeNull();
    expect(h.operations).toHaveLength(1);
  });

  it("une erreur de lecture des neutralisations échoue fermé", async () => {
    h.etats = { ancienne: "terminee" };
    h.erreurNeutralisation = "panne fictive";
    h.reponsesRpc = [reponse("ancienne")];

    await expect(demarrerTentative(params)).resolves.toBeNull();
    expect(h.operations).toHaveLength(1);
  });

  it("une nouvelle tentative encore fermée ou illisible est refusée", async () => {
    h.etats = { ancienne: "abandonnee", nouvelle: "abandonnee" };
    h.reponsesRpc = [reponse("ancienne"), reponse("nouvelle")];
    await expect(demarrerTentative(params)).resolves.toBeNull();

    h.reponsesRpc = [reponse("ancienne"), reponse("nouvelle")];
    h.erreursEtats = { nouvelle: "panne fictive" };
    await expect(demarrerTentative(params)).resolves.toBeNull();
  });

  it("la réouverture ne peut pas rendre deux fois le même ID", async () => {
    h.etats = { ancienne: "terminee" };
    h.neutralisees = new Set(["ancienne"]);
    h.reponsesRpc = [reponse("ancienne"), reponse("ancienne")];

    await expect(demarrerTentative(params)).resolves.toBeNull();
  });
});
