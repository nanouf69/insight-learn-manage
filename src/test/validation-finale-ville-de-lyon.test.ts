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
// Renouvellement de connexion qui ne répond jamais (cas tablette Android du 10/10).
vi.mock("@/lib/sessionExpiree", () => ({
  assurerSessionFraiche: () => new Promise<string | null>((r) => setTimeout(() => r(null), 8000)),
}));

import { enqueueAnswerSave, flushAnswerSavesAndWait, setAnswerSaveAuthToken, setAnswerSaveOwnership } from "@/lib/answerPersistence";

const EXO = "module_8_exo_1785332774763";
const jwt = (sub: string) => `h.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.s`;
const quizComplet = (l: string) => Object.fromEntries(Array.from({ length: 99 }, (_, i) => [`q${i + 1}`, [l]]));
const login = (l: string) => {
  setAnswerSaveAuthToken(null, null);
  setAnswerSaveOwnership({ apprenantId: null });
  setAnswerSaveAuthToken(jwt(`user-${l}`), `user-${l}`);
  setAnswerSaveOwnership({ apprenantId: `app-${l}` });
};

describe("Validation finale Ville de Lyon : 99 questions, tablette lente, élèves successifs", () => {
  const serveur = new Map<string, Record<string, unknown>>();
  beforeEach(() => {
    localStorage.clear();
    serveur.clear();
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: any) => {
      await new Promise((r) => setTimeout(r, 3000)); // latence réseau
      const body = JSON.parse(init.body);
      serveur.set(body.apprenant_id, body.reponses);
      return { ok: true, status: 200, json: async () => ({ success: true, confirmed: true, write_seq: 1 }) };
    }));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  for (const l of ["A", "B", "C"]) {
    it(`élève ${l} : envoi confirmé avant le délai de 20 s de la validation, 99/99 en base`, async () => {
      login(l);
      enqueueAnswerSave({ apprenant_id: `app-${l}`, exercice_id: EXO, exercice_type: "quiz", reponses: quizComplet(l) });
      const p = flushAnswerSavesAndWait(`app-${l}`, EXO);
      await vi.advanceTimersByTimeAsync(20000);
      expect(await p).toBe(true);
      expect(Object.keys(serveur.get(`app-${l}`) ?? {})).toHaveLength(99);
      expect(Object.values(serveur.get(`app-${l}`)!).every((v: any) => v[0] === l)).toBe(true);
    });
  }

  it("rechargement : la réponse en file repart et la validation peut aboutir", async () => {
    login("A");
    enqueueAnswerSave({ apprenant_id: "app-A", exercice_id: EXO, exercice_type: "quiz", reponses: quizComplet("A") });
    login("A"); // simulation d'un rechargement de page
    const p = flushAnswerSavesAndWait("app-A", EXO);
    await vi.advanceTimersByTimeAsync(20000);
    expect(await p).toBe(true);
    expect(Object.keys(serveur.get("app-A") ?? {})).toHaveLength(99);
  });
});
