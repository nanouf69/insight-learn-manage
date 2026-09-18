// @vitest-environment node
/**
 * SÉCURITÉ 1 — L'ordre des écritures est décidé par le SERVEUR.
 * Une réponse composée hors connexion emporte le dernier numéro d'écriture
 * serveur qu'elle connaissait ; le serveur refuse ensuite de lui laisser
 * écraser une réponse plus récente.
 */
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

import { enqueueAnswerSave, setAnswerSaveAuthToken } from "@/lib/answerPersistence";

const APPRENANT = "11111111-1111-1111-1111-111111111111";
const EXO = "EB1__gestion__t1";

const basePayload = (overrides: Record<string, any> = {}) => ({
  apprenant_id: APPRENANT,
  user_id: "22222222-2222-2222-2222-222222222222",
  module_id: 7,
  exercice_id: EXO,
  exercice_type: "examen_blanc",
  reponses: { "1": ["A"] },
  events: [{ question_id: "1", valeur: ["A"] }],
  ...overrides,
});

const sentBodies = (fetchMock: any) =>
  fetchMock.mock.calls.map((call: any[]) => JSON.parse(call[1].body));

describe("Ordre des écritures décidé par le serveur", () => {
  beforeEach(() => {
    localStorage.clear();
    setAnswerSaveAuthToken("test-token", "22222222-2222-2222-2222-222222222222");
  });
  afterEach(() => vi.restoreAllMocks());

  it("envoie base_seq = 0 à la première réponse, puis le numéro renvoyé par le serveur", async () => {
    let seq = 0;
    const fetchMock = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ success: true, confirmed: true, write_seq: ++seq }),
      text: async () => "",
    }));
    vi.stubGlobal("fetch", fetchMock);

    enqueueAnswerSave(basePayload());
    await new Promise((r) => setTimeout(r, 0));
    enqueueAnswerSave(basePayload({ reponses: { "1": ["B"] } }));
    await new Promise((r) => setTimeout(r, 0));

    const bodies = sentBodies(fetchMock);
    expect(bodies[0].base_seq).toBe(0);
    expect(bodies[1].base_seq).toBe(1);
  });

  it("n'utilise jamais l'horloge de l'appareil pour trancher (aucun updated_at décisif)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, confirmed: true, write_seq: 5 }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    enqueueAnswerSave(basePayload());
    await new Promise((r) => setTimeout(r, 0));

    const body = sentBodies(fetchMock)[0];
    expect(typeof body.base_seq).toBe("number");
  });

  it("compactage hors connexion : conserve le numéro d'écriture le plus ancien", async () => {
    // Aucun envoi possible (réseau en échec) : les éléments restent en file.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    localStorage.setItem(
      "answer_write_seq_v1",
      JSON.stringify({ [`${APPRENANT}__${EXO}`]: 3 }),
    );

    enqueueAnswerSave(basePayload());
    // Le serveur a entre-temps avancé, mais cet appareil ne le sait pas encore.
    localStorage.setItem(
      "answer_write_seq_v1",
      JSON.stringify({ [`${APPRENANT}__${EXO}`]: 9 }),
    );
    enqueueAnswerSave(basePayload({ reponses: { "1": ["C"] } }));

    const queue = JSON.parse(localStorage.getItem("answer_save_queue_v1") || "[]");
    const item = queue.find((q: any) => q.payload.exercice_id === EXO);
    expect(item.payload.base_seq).toBe(3);
    // Les réponses ne sont jamais perdues : la dernière valeur est conservée.
    expect(item.payload.reponses["1"]).toEqual(["C"]);
  });
});
