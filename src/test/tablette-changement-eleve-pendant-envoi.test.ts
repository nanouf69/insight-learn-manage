// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));

// Jetons au format JWT (sub = compte) pour reproduire la vraie situation.
const jwt = (sub: string) =>
  `h.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.s`;

// Renouvellement lent, qui finit par rendre le jeton de l'élève PRÉCÉDENT.
let renouvellement: () => Promise<string | null> = async () => null;
vi.mock("@/lib/sessionExpiree", () => ({ assurerSessionFraiche: () => renouvellement() }));

import { enqueueAnswerSave, setAnswerSaveAuthToken, setAnswerSaveOwnership } from "@/lib/answerPersistence";

const queue = () => JSON.parse(localStorage.getItem("answer_save_queue_v1") ?? "[]") as any[];
const login = (l: string) => {
  setAnswerSaveAuthToken(null, null);
  setAnswerSaveOwnership({ apprenantId: null });
  setAnswerSaveAuthToken(jwt(`user-${l}`), `user-${l}`);
  setAnswerSaveOwnership({ apprenantId: `app-${l}` });
};

describe("Tablette : changement d'élève pendant un envoi en cours", () => {
  const envois: Array<{ sub: string; apprenant: string }> = [];
  let refus = 0;
  beforeEach(() => {
    localStorage.clear();
    envois.length = 0;
    refus = 0;
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: any) => {
      const tok = String(init.headers.Authorization).replace("Bearer ", "");
      const sub = JSON.parse(Buffer.from(tok.split(".")[1], "base64url").toString()).sub;
      const body = JSON.parse(init.body);
      if (sub.replace("user-", "app-") !== body.apprenant_id) {
        refus += 1;
        return { ok: false, status: 403, text: async () => "auth_user_id_mismatch" };
      }
      envois.push({ sub, apprenant: body.apprenant_id });
      return { ok: true, status: 200, json: async () => ({ success: true, confirmed: true, write_seq: envois.length }) };
    }));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("A envoie, B se connecte pendant le renouvellement : aucun envoi croisé, aucun refus, tout remonte au bon élève", async () => {
    renouvellement = () => new Promise((r) => setTimeout(() => r(jwt("user-A")), 5000));
    login("A");
    enqueueAnswerSave({ apprenant_id: "app-A", exercice_id: "module_8_exo_1", exercice_type: "quiz", reponses: { q1: ["A"] } });
    await vi.advanceTimersByTimeAsync(1500); // envoi de A en attente du renouvellement
    login("B"); // élève suivant sur la même tablette
    enqueueAnswerSave({ apprenant_id: "app-B", exercice_id: "module_8_exo_1", exercice_type: "quiz", reponses: { q1: ["B"] } });
    renouvellement = async () => null;
    await vi.advanceTimersByTimeAsync(60000);

    expect(refus).toBe(0); // jamais de réponse envoyée sous le mauvais compte
    expect(envois.every((e) => e.sub.replace("user-", "app-") === e.apprenant)).toBe(true);
    expect(envois.some((e) => e.apprenant === "app-B")).toBe(true);
    // Réponse de A conservée, ni bloquée ni marquée refusée.
    const a = queue().filter((i) => i.payload.apprenant_id === "app-A");
    expect(a).toHaveLength(1);
    expect(a[0].blocked).toBeFalsy();
    expect(a[0].payload.reponses).toEqual({ q1: ["A"] });

    login("A"); // A revient sur la tablette
    await vi.advanceTimersByTimeAsync(60000);
    expect(refus).toBe(0);
    expect(queue()).toHaveLength(0);
    expect(envois.filter((e) => e.apprenant === "app-A")).toHaveLength(1);
  });
});
