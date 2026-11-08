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

// Verrou de session bloqué (cas Android du 10/10) : getSession ne répond jamais.
const auth = vi.hoisted(() => ({ bloque: true }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () =>
        auth.bloque
          ? new Promise(() => {})
          : Promise.resolve({ data: { session: { access_token: "t", refresh_token: "r", expires_at: Date.now() / 1000 + 3600 } } }),
      refreshSession: () => new Promise(() => {}),
    },
  },
}));

import { assurerSessionFraiche, RENOUVELLEMENT_DELAI_MS } from "@/lib/sessionExpiree";
import {
  enqueueAnswerSave,
  flushAnswerSavesAndWait,
  getPendingAnswers,
  getPendingAnswerSaves,
  setAnswerSaveAuthToken,
  setAnswerSaveOwnership,
  ENVOI_DELAI_MS,
} from "@/lib/answerPersistence";

const A = "11111111-1111-1111-1111-111111111111";
const payload = (reponses: Record<string, any>) => ({
  apprenant_id: A,
  user_id: "22222222-2222-2222-2222-222222222222",
  module_id: 8,
  exercice_id: "module_8_exo_fictif",
  exercice_type: "quiz",
  reponses,
});
const ok = () => ({ ok: true, json: async () => ({ success: true, confirmed: true, write_seq: 1 }), text: async () => "" });

describe("File des réponses : jamais figée (incident du 10/10)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    auth.bloque = true;
    setAnswerSaveAuthToken("jeton-fictif", "22222222-2222-2222-2222-222222222222");
    setAnswerSaveOwnership({ apprenantId: A });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("le renouvellement bloqué rend la main après le délai", async () => {
    const p = assurerSessionFraiche(60);
    await vi.advanceTimersByTimeAsync(RENOUVELLEMENT_DELAI_MS + 10);
    await expect(p).resolves.toBeNull();
  });

  it("verrou bloqué : les réponses partent quand même et sont confirmées", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", fetchMock);
    enqueueAnswerSave(payload({ "q-1": ["A"] }));
    const done = flushAnswerSavesAndWait(A, "module_8_exo_fictif", 20000);
    await vi.advanceTimersByTimeAsync(RENOUVELLEMENT_DELAI_MS + 500);
    await expect(done).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getPendingAnswerSaves()).toBe(0);
  });

  it("envoi sans réponse serveur : abandon, réponse gardée, renvoi réussi ensuite", async () => {
    auth.bloque = false;
    let n = 0;
    const fetchMock = vi.fn((_u: string, init: any) => {
      n++;
      if (n === 1) {
        return new Promise((_res, rej) => init.signal?.addEventListener("abort", () => rej(new Error("aborted"))));
      }
      return Promise.resolve(ok());
    });
    vi.stubGlobal("fetch", fetchMock);
    enqueueAnswerSave(payload({ "q-1": ["A"], "q-2": ["C"] }));
    await vi.advanceTimersByTimeAsync(ENVOI_DELAI_MS + 100);
    // Pendant la panne : réponses toujours en file locale (rien perdu).
    expect(getPendingAnswers(A, "module_8_exo_fictif")).toMatchObject({ "q-1": ["A"], "q-2": ["C"] });
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(getPendingAnswerSaves()).toBe(0);
  });

  it("un événement confirmé n'est pas renvoyé dans le lot compacté suivant", async () => {
    auth.bloque = false;
    const e1 = "11111111-1111-4111-8111-111111111111";
    const e2 = "22222222-2222-4222-8222-222222222222";
    const reponses: Array<(value: any) => void> = [];
    const fetchMock = vi.fn(() => new Promise((resolve) => reponses.push(resolve)));
    vi.stubGlobal("fetch", fetchMock);

    enqueueAnswerSave(payload({ "q-1": ["A"] }));
    // Remplacer les événements par des identifiants stables pour suivre les ACK.
    const brut = JSON.parse(localStorage.getItem("answer_save_queue_v1")!);
    brut[0].payload.events = [{ event_id: e1, question_id: "q-1", valeur: ["A"] }];
    localStorage.setItem("answer_save_queue_v1", JSON.stringify(brut));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    enqueueAnswerSave(payload({ "q-1": ["A"], "q-2": ["B"] }));
    const enAttente = JSON.parse(localStorage.getItem("answer_save_queue_v1")!);
    enAttente[0].payload.events = [
      { event_id: e1, question_id: "q-1", valeur: ["A"] },
      { event_id: e2, question_id: "q-2", valeur: ["B"] },
    ];
    localStorage.setItem("answer_save_queue_v1", JSON.stringify(enAttente));
    reponses[0]({ ok: true, json: async () => ({ success: true, confirmed: true, write_seq: 1, accepted_event_ids: [e1] }), text: async () => "" });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = JSON.parse((fetchMock.mock.calls[1] as any)[1].body);
    expect(second.events.map((e: any) => e.event_id)).toEqual([e2]);

    reponses[1]({ ok: true, json: async () => ({ success: true, confirmed: true, write_seq: 2, accepted_event_ids: [e2] }), text: async () => "" });
    await vi.advanceTimersByTimeAsync(0);
    expect(getPendingAnswerSaves()).toBe(0);
  });

  it("un accusé incomplet conserve tout le lot pour un renvoi idempotent", async () => {
    auth.bloque = false;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, confirmed: true, write_seq: 1, accepted_event_ids: [] }), text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    enqueueAnswerSave({ ...payload({ "q-1": ["A"] }), events: [{ event_id: "11111111-1111-4111-8111-111111111111", question_id: "q-1", valeur: ["A"] }] });
    await vi.advanceTimersByTimeAsync(0);
    expect(getPendingAnswerSaves()).toBe(1);
    expect(getPendingAnswers(A, "module_8_exo_fictif")).toMatchObject({ "q-1": ["A"] });
  });

  it("réponses ajoutées pendant la panne : toutes envoyées après rétablissement (rechargement simulé)", async () => {
    auth.bloque = false;
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));
    enqueueAnswerSave(payload({ "q-1": ["A"] }));
    enqueueAnswerSave(payload({ "q-1": ["A"], "q-2": ["B"] }));
    await vi.advanceTimersByTimeAsync(3000);
    // Rechargement : nouvelle session ouverte, file relue depuis le stockage local.
    setAnswerSaveAuthToken(null);
    const fetchOk = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", fetchOk);
    setAnswerSaveAuthToken("jeton-reconnexion", "22222222-2222-2222-2222-222222222222");
    await vi.advanceTimersByTimeAsync(40000);
    const envoye = JSON.parse(fetchOk.mock.calls.at(-1)![1].body);
    expect(envoye.reponses).toMatchObject({ "q-1": ["A"], "q-2": ["B"] });
    expect(getPendingAnswerSaves()).toBe(0);
  });
});

import { delaiEnvoiPour, ENVOI_DELAI_MS as D1, ENVOI_DELAI_REESSAI_MS } from "@/lib/answerPersistence";
describe("délai d'envoi adaptatif (serveur lent 17/10)", () => {
  it("premier envoi 15 s, réessais 60 s", () => {
    expect(delaiEnvoiPour(0)).toBe(D1);
    expect(D1).toBe(15000);
    expect(delaiEnvoiPour(1)).toBe(ENVOI_DELAI_REESSAI_MS);
    expect(ENVOI_DELAI_REESSAI_MS).toBe(60000);
  });
});
