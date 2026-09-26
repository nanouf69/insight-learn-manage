// @vitest-environment node
/**
 * Correctif 26/09/2026 — pontV2 envoie le numéro de version connu.
 * Faux serveur reproduisant exactement les règles de core_save_answer.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

type Ligne = { valeur: unknown; revision: number };
const serveur = new Map<string, Ligne>();
const ops = new Map<string, unknown>();
const k = (a: string, q: string) => `${a}|${q}`;

function coreSaveAnswer(p: any) {
  if (ops.has(p.p_operation_id)) return { data: ops.get(p.p_operation_id), error: null };
  const cle = k(p.p_attempt_id, p.p_question_id);
  const courant = serveur.get(cle);
  const exp = p.p_expected_revision;
  let res;
  if (!courant) {
    if ((exp ?? 0) !== 0) return { data: null, error: { message: "ANSWER_STALE_REVISION P0409" } };
    serveur.set(cle, { valeur: p.p_valeur, revision: 1 });
    res = { revision: 1 };
  } else {
    if (exp == null && JSON.stringify(courant.valeur) === JSON.stringify(p.p_valeur)) {
      res = { revision: courant.revision };
      ops.set(p.p_operation_id, res);
      return { data: res, error: null };
    }
    if (exp !== courant.revision) return { data: null, error: { message: "ANSWER_STALE_REVISION P0409" } };
    serveur.set(cle, { valeur: p.p_valeur, revision: courant.revision + 1 });
    res = { revision: courant.revision + 1 };
  }
  ops.set(p.p_operation_id, res);
  return { data: res, error: null };
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (_n: string, p: any) => coreSaveAnswer(p),
    from: () => {
      const f: Record<string, string> = {};
      const q: any = {
        select: () => q,
        eq: (c: string, v: string) => { f[c] = v; return q; },
        maybeSingle: async () => {
          const l = serveur.get(k(f.attempt_id, f.question_id));
          return { data: l ? { ...l } : null, error: null };
        },
        then: (ok: any) => ok({
          data: [...serveur.entries()].filter(([c]) => c.startsWith(`${f.attempt_id}|`))
            .map(([c, l]) => ({ question_id: c.split("|")[1], revision: l.revision })),
          error: null,
        }),
      };
      return q;
    },
  },
}));

import { enfilerReponseNoyau, viderFileNoyau, __simulerRechargementPourTests } from "@/features/noyau-passage/pontV2";

const A = "att-1";
const envoyer = async (questionId: number, valeur: unknown) => {
  enfilerReponseNoyau({ attemptId: A, matiereId: "securite", questionId, valeur });
  await viderFileNoyau(A);
};
const val = (q: number) => serveur.get(k(A, `securite:${q}`));
const ecartees = () => JSON.parse(store.get("noyau_v2_answer_queue_parked_v1") ?? "[]");

describe("pontV2 — numéro de version connu", () => {
  beforeEach(() => { serveur.clear(); ops.clear(); store.clear(); __simulerRechargementPourTests(); });

  it("modification sur la même tablette acceptée (y compris retour A → B → A)", async () => {
    await envoyer(1, ["A"]); await envoyer(1, ["B"]); await envoyer(1, ["A"]);
    expect(val(1)).toEqual({ valeur: ["A"], revision: 3 });
    expect(ecartees()).toHaveLength(0);
  });

  it("modification après rechargement acceptée", async () => {
    await envoyer(2, ["A"]);
    store.delete("noyau_v2_revisions_confirmees_v1"); // autre tablette / cache vidé
    __simulerRechargementPourTests();
    await envoyer(2, ["C"]);
    expect(val(2)).toEqual({ valeur: ["C"], revision: 2 });
  });

  it("case ajoutée à un QCM (A puis A+B) acceptée", async () => {
    await envoyer(3, ["A"]); await envoyer(3, ["A", "B"]);
    expect(val(3)?.valeur).toEqual(["A", "B"]);
  });

  it("texte QRC complété accepté", async () => {
    await envoyer(4, "Le conduc"); await envoyer(4, "Le conducteur doit céder le passage.");
    expect(val(4)?.valeur).toBe("Le conducteur doit céder le passage.");
  });

  it("conflit réel avec un autre appareil : refus, mise de côté, aucun écrasement", async () => {
    await envoyer(5, ["A"]);
    // Autre appareil : modifie la réponse côté serveur après notre chargement.
    serveur.set(k(A, "securite:5"), { valeur: ["D"], revision: 2 });
    await envoyer(5, ["B"]);
    expect(val(5)).toEqual({ valeur: ["D"], revision: 2 });
    expect(ecartees()).toHaveLength(1);
    expect(ecartees()[0].valeur).toEqual(["B"]);
  });
});
