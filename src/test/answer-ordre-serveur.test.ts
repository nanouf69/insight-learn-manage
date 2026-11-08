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

import { enqueueAnswerSave, flushAnswerSavesAndWait, setAnswerSaveAuthToken, setAnswerSaveOwnership } from "@/lib/answerPersistence";

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

const ackJson = (init: RequestInit, values: Record<string, unknown>) => async () => {
  const body = JSON.parse(String(init.body));
  return { ...values, accepted_event_ids: (body.events ?? []).map((event: any) => event.event_id).filter(Boolean) };
};

describe("Ordre des écritures décidé par le serveur", () => {
  beforeEach(() => {
    localStorage.clear();
    setAnswerSaveAuthToken("test-token", "22222222-2222-2222-2222-222222222222");
    setAnswerSaveOwnership({ apprenantId: APPRENANT, previewReadOnly: false });
  });
  afterEach(() => vi.restoreAllMocks());

  it("envoie base_seq = 0 à la première réponse, puis le numéro renvoyé par le serveur", async () => {
    let seq = 0;
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => ({
      ok: true,
      json: ackJson(init, { success: true, confirmed: true, write_seq: ++seq }),
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
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => ({
      ok: true,
      json: ackJson(init, { success: true, confirmed: true, write_seq: 5 }),
      text: async () => "",
    }));
    vi.stubGlobal("fetch", fetchMock);

    enqueueAnswerSave(basePayload());
    await new Promise((r) => setTimeout(r, 0));

    const body = sentBodies(fetchMock)[0];
    expect(typeof body.base_seq).toBe("number");
  });

  it("une version ignorée par le serveur reste locale, bloque la clôture et n'avance pas base_seq", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (_url: string, init: RequestInit) => ({
      ok: true,
      json: ackJson(init, { success: true, confirmed: true, write_seq: 9, skipped_questions: ["revisionState"] }),
      text: async () => "",
    })));
    enqueueAnswerSave(basePayload({
      exercice_id: "revision_fausses_EB1", exercice_type: "revision_fausses",
      reponses: { revisionState: { currentIndex: 0, answers: { "t3p:1": ["A"] } } },
    }));
    await new Promise((r) => setTimeout(r, 20));
    const queue = JSON.parse(localStorage.getItem("answer_save_queue_v1") || "[]");
    expect(queue).toHaveLength(1);
    expect(queue[0].blocked).toBe(true);
    expect(queue[0].payload.base_seq).toBe(0);
    expect(queue[0].payload.reponses.revisionState.answers["t3p:1"]).toEqual(["A"]);
    expect(queue[0].rejection.message).toContain("version plus récente");
    enqueueAnswerSave(basePayload({
      exercice_id: "revision_fausses_EB1", exercice_type: "revision_fausses", completed: true,
      reponses: { revisionState: { currentIndex: 0, answers: { "t3p:1": ["A"] } } },
    }));
    await new Promise((r) => setTimeout(r, 20));
    // Le nouvel essai de clôture peut repartir une fois, mais sans preuve de
    // recomposition le serveur le refuse à nouveau : il reste bloqué.
    expect(fetch).toHaveBeenCalledTimes(2);
    const apresCloture = JSON.parse(localStorage.getItem("answer_save_queue_v1") || "[]");
    expect(apresCloture.find((q: any) => q.payload.completed)?.blocked).toBe(true);
    expect(await flushAnswerSavesAndWait(APPRENANT, "revision_fausses_EB1", 50)).toBe(false);
  });

  it("une réponse composée pendant un envoi lent repart avec le numéro confirmé précédent", async () => {
    let confirmerPremierEnvoi: (() => void) | undefined;
    const fetchMock = vi.fn()
      .mockImplementationOnce((_url: string, init: RequestInit) => new Promise((resolve) => {
        confirmerPremierEnvoi = () => resolve({
          ok: true,
          json: ackJson(init, { success: true, confirmed: true, write_seq: 1 }),
          text: async () => "",
        });
      }))
      .mockImplementationOnce(async (_url: string, init: RequestInit) => ({
        ok: true,
        json: ackJson(init, { success: true, confirmed: true, write_seq: 2 }),
        text: async () => "",
      }));
    vi.stubGlobal("fetch", fetchMock);

    enqueueAnswerSave(basePayload());
    await new Promise((r) => setTimeout(r, 0));
    enqueueAnswerSave(basePayload({ reponses: { "1": ["B"] } }));
    await new Promise((r) => setTimeout(r, 0));
    confirmerPremierEnvoi?.();
    await new Promise((r) => setTimeout(r, 30));

    const bodies = sentBodies(fetchMock);
    expect(bodies).toHaveLength(2);
    expect(bodies[0].base_seq).toBe(0);
    expect(bodies[1].base_seq).toBe(1);
  });

  it("ne rebase pas une révision d'un autre onglet qui ne contient pas la réponse précédente", async () => {
    let confirmerPremierEnvoi: (() => void) | undefined;
    const fetchMock = vi.fn()
      .mockImplementationOnce((_url: string, init: RequestInit) => new Promise((resolve) => {
        confirmerPremierEnvoi = () => resolve({
          ok: true,
          json: ackJson(init, { success: true, confirmed: true, write_seq: 1, skipped_questions: [] }),
          text: async () => "",
        });
      }))
      .mockImplementationOnce(async (_url: string, init: RequestInit) => ({
        ok: true,
        json: ackJson(init, { success: true, confirmed: true, write_seq: 1, skipped_questions: ["revisionState"] }),
        text: async () => "",
      }));
    vi.stubGlobal("fetch", fetchMock);
    const etat = (answers: Record<string, unknown>) => ({
      version: 1, examenId: "EB1", currentIndex: 0, correctedCount: 0,
      correctedQuestions: [], showCorrection: false, questionOrder: ["t3p:1"], answers,
    });
    enqueueAnswerSave(basePayload({
      exercice_id: "revision_fausses_EB1", exercice_type: "revision_fausses",
      reponses: { revisionState: etat({ "t3p:1": ["A"] }) },
    }));
    await new Promise((r) => setTimeout(r, 0));
    enqueueAnswerSave(basePayload({
      exercice_id: "revision_fausses_EB1", exercice_type: "revision_fausses",
      reponses: { revisionState: etat({}) },
    }));
    await new Promise((r) => setTimeout(r, 0));
    confirmerPremierEnvoi?.();
    await new Promise((r) => setTimeout(r, 30));
    const bodies = sentBodies(fetchMock);
    expect(bodies[1].base_seq).toBe(0);
    expect(bodies[1].reponses.revisionState.answers).toEqual({});
  });

  it("reprend une clôture déjà bloquée seulement par ajouts sans conflit, avec une nouvelle opération", async () => {
    const serveur = {
      version: 1, examenId: "EB1", currentIndex: 0, correctedCount: 0,
      correctedQuestions: [], showCorrection: false, questionOrder: ["t3p:1", "gestion:1"],
      answers: { "t3p:1": ["A"] },
    };
    const local = {
      ...serveur, currentIndex: 1, correctedCount: 1, correctedQuestions: ["gestion:1"], showCorrection: true,
      answers: { "t3p:1": ["A"], "gestion:1": "réponse QRC fictive" },
    };
    localStorage.setItem("answer_save_queue_v1", JSON.stringify([{
      id: "ancienne_sauvegarde_bloquee", queued_at: new Date().toISOString(), attempts: 1,
      owner_user_id: "22222222-2222-2222-2222-222222222222", blocked: true,
      rejection: { exerciceId: "revision_fausses_EB1", reason: "refused", at: new Date().toISOString() },
      payload: basePayload({
        exercice_id: "revision_fausses_EB1", exercice_type: "revision_fausses",
        reponses: { revisionState: serveur }, score: 0, events: [{ question_id: "t3p:1", valeur: ["A"] }],
      }),
    }]));
    const fetchMock = vi.fn()
      .mockImplementationOnce(async (_url: string, init: RequestInit) => ({
        ok: true,
        json: ackJson(init, { success: true, confirmed: true, write_seq: 9, skipped_questions: ["revisionState"], stored_reponses: { revisionState: serveur } }),
        text: async () => "",
      }))
      .mockImplementationOnce(async (_url: string, init: RequestInit) => ({
        ok: true,
        json: ackJson(init, { success: true, confirmed: true, write_seq: 10, skipped_questions: [] }),
        text: async () => "",
      }));
    vi.stubGlobal("fetch", fetchMock);

    enqueueAnswerSave(basePayload({
      exercice_id: "revision_fausses_EB1", exercice_type: "revision_fausses", completed: true,
      reponses: { revisionState: local }, score: 1,
      events: [{ question_id: "gestion:1", valeur: "réponse QRC fictive" }],
    }));
    await new Promise((r) => setTimeout(r, 3000));

    const bodies = sentBodies(fetchMock);
    expect(bodies).toHaveLength(2);
    expect(bodies[0].completed).toBe(true);
    expect(bodies[1].base_seq).toBe(9);
    expect(bodies[1].operation_id).not.toBe(bodies[0].operation_id);
    expect(bodies[1].reponses.revisionState.answers["gestion:1"]).toBe("réponse QRC fictive");
    expect(JSON.parse(localStorage.getItem("answer_save_queue_v1") || "[]")).toHaveLength(0);
    await expect(flushAnswerSavesAndWait(APPRENANT, "revision_fausses_EB1", 50)).resolves.toBe(true);
  });

  it("refuse la recomposition si une réponse serveur diffère, et conserve la version locale", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (_url: string, init: RequestInit) => ({
      ok: true,
      json: ackJson(init, {
        success: true, confirmed: true, write_seq: 9, skipped_questions: ["revisionState"],
        stored_reponses: { revisionState: {
          version: 1, examenId: "EB1", currentIndex: 0, correctedCount: 0,
          correctedQuestions: [], showCorrection: false, questionOrder: ["t3p:1"], answers: { "t3p:1": ["B"] },
        } },
      }),
      text: async () => "",
    }));
    enqueueAnswerSave(basePayload({
      exercice_id: "revision_fausses_EB1", exercice_type: "revision_fausses",
      reponses: { revisionState: {
        version: 1, examenId: "EB1", currentIndex: 0, correctedCount: 0,
        correctedQuestions: [], showCorrection: false, questionOrder: ["t3p:1"], answers: { "t3p:1": ["A"] },
      } },
    }));
    await new Promise((r) => setTimeout(r, 30));
    expect(fetch).toHaveBeenCalledTimes(1);
    const queue = JSON.parse(localStorage.getItem("answer_save_queue_v1") || "[]");
    expect(queue[0].blocked).toBe(true);
    expect(queue[0].payload.reponses.revisionState.answers["t3p:1"]).toEqual(["A"]);
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
