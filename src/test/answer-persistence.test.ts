// @vitest-environment node
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Stub minimal de localStorage (l'environnement DOM complet n'est pas requis).
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

import {
  enqueueAnswerSave,
  getPendingAnswerSaves,
  subscribeAnswerSaveState,
  setAnswerSaveAuthToken,
} from "@/lib/answerPersistence";

const flush = async (ms = 0) => {
  await vi.advanceTimersByTimeAsync(ms);
  await Promise.resolve();
};

const payload = (overrides: Record<string, any> = {}) => ({
  apprenant_id: "11111111-1111-1111-1111-111111111111",
  user_id: "22222222-2222-2222-2222-222222222222",
  module_id: 7,
  exercice_id: "module_7_exo_1",
  exercice_type: "quiz",
  reponses: { "1-1": ["A"] },
  events: [{ question_id: "1-1", valeur: ["A"] }],
  ...overrides,
});

describe("Persistance des réponses apprenants", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    setAnswerSaveAuthToken("test-token");
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("envoie la réponse au serveur et vide la file après confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    enqueueAnswerSave(payload());
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.apprenant_id).toBeTruthy();
    expect(body.module_id).toBe(7);
    expect(body.exercice_id).toBe("module_7_exo_1");
    expect(body.events[0]).toMatchObject({ question_id: "1-1" });
    expect(getPendingAnswerSaves()).toBe(0);
  });

  it("conserve la réponse en file et signale l'échec quand le serveur refuse", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "boom" });
    vi.stubGlobal("fetch", fetchMock);

    const states: string[] = [];
    const unsub = subscribeAnswerSaveState((s) => states.push(s));

    enqueueAnswerSave(payload());
    await flush();

    expect(states).toContain("error");
    expect(states).not.toContain("saved");
    // La réponse reste en file, donc renvoyable après rechargement.
    expect(getPendingAnswerSaves()).toBe(1);
    expect(localStorage.getItem("answer_save_queue_v1")).toContain("module_7_exo_1");
    unsub();
  });

  it("réessaie automatiquement jusqu'au succès sans perdre la réponse", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "boom" })
      .mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    enqueueAnswerSave(payload());
    await flush();
    expect(getPendingAnswerSaves()).toBe(1);

    await flush(5000);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(getPendingAnswerSaves()).toBe(0);
  });

  it("garde la dernière réponse choisie quand l'apprenant change d'avis", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "boom" });
    vi.stubGlobal("fetch", fetchMock);

    enqueueAnswerSave(payload({ reponses: { "1-1": ["A"] } }));
    enqueueAnswerSave(payload({ reponses: { "1-1": ["B"] } }));
    await flush();

    const queue = JSON.parse(localStorage.getItem("answer_save_queue_v1") || "[]");
    const last = queue[queue.length - 1];
    expect(last.payload.reponses["1-1"]).toEqual(["B"]);
    // Les deux clics restent tracés dans le journal envoyé au serveur.
    expect(last.payload.events.length).toBe(2);
  });
});
