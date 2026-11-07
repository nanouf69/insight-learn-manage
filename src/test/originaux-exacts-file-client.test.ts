// @vitest-environment node
// File client avec U+0000 : la saisie exacte part telle quelle vers la fonction serveur ;
// succès seulement sur confirmation, refus 22P05 définitif sans boucle, et jamais
// « conservée » si la file n'existe qu'en mémoire (stockage plein).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
let plein = false;
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k) ?? null : null),
  setItem: (k: string, v: string) => { if (plein && k === "answer_save_queue_v1") throw new Error("QuotaExceededError"); store.set(k, v); },
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

import {
  enqueueAnswerSave, getBlockedAnswerSaves, getPendingAnswerSaves, getPendingAnswers,
  MESSAGE_MEMOIRE_SEULE, onAnswerSaveRejected, setAnswerSaveAuthToken, setAnswerSaveOwnership,
} from "@/lib/answerPersistence";

const APP = "11111111-1111-1111-1111-111111111111";
const UID = "22222222-2222-2222-2222-222222222222";
const NUL_TXT = "a\u0000b ␀ é😀";
const flush = async (ms = 0) => { await vi.advanceTimersByTimeAsync(ms); await Promise.resolve(); };
const refus22P05 = { ok: false, status: 422, text: async () => JSON.stringify({ error: "22P05 conservation exacte non activée", code: "NUL_NON_SUPPORTE" }) };

describe("File client et U+0000", () => {
  beforeEach(() => {
    store.clear(); plein = false;
    vi.useFakeTimers();
    setAnswerSaveAuthToken("test-token", UID);
    setAnswerSaveOwnership({ apprenantId: APP });
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("saisie exacte transmise (aucune altération côté appareil) ; file vidée seulement après confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, confirmed: true, write_seq: 1, skipped_questions: [], accepted_event_ids: [] }), text: async () => JSON.stringify({ success: true, confirmed: true, write_seq: 1 }) });
    vi.stubGlobal("fetch", fetchMock);
    enqueueAnswerSave({ apprenant_id: APP, user_id: UID, exercice_id: "EB1__nul_ok", exercice_type: "examen_blanc", reponses: { "1": NUL_TXT } });
    expect(getPendingAnswers(APP, "EB1__nul_ok")).toEqual({ "1": NUL_TXT });
    await flush();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).reponses).toEqual({ "1": NUL_TXT });
    expect(getPendingAnswerSaves()).toBe(0);
  });

  it("refus 22P05 (migration absente) : un seul envoi, élément bloqué et conservé, aucune boucle", async () => {
    const fetchMock = vi.fn().mockResolvedValue(refus22P05);
    vi.stubGlobal("fetch", fetchMock);
    enqueueAnswerSave({ apprenant_id: APP, user_id: UID, exercice_id: "EB1__nul_ko", exercice_type: "examen_blanc", reponses: { "1": NUL_TXT } });
    await flush(); await flush(120_000);
    expect(fetchMock.mock.calls.filter((c) => JSON.parse(c[1].body).exercice_id === "EB1__nul_ko")).toHaveLength(1);
    expect(getPendingAnswers(APP, "EB1__nul_ko")).toEqual({ "1": NUL_TXT });
    expect(getBlockedAnswerSaves()).toBeGreaterThanOrEqual(1);
  });

  it("stockage plein : le refus ne prétend jamais que la réponse est conservée sur l'appareil", async () => {
    plein = true;
    let vu: string | undefined;
    const off = onAnswerSaveRejected((r) => { if (r) vu = r.message; });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(refus22P05));
    enqueueAnswerSave({ apprenant_id: APP, user_id: UID, exercice_id: "EB1__nul_ram", exercice_type: "examen_blanc", reponses: { "1": NUL_TXT } });
    await flush();
    off();
    expect(vu).toBeDefined();
    expect(vu).toContain(MESSAGE_MEMOIRE_SEULE);
    expect(vu).not.toMatch(/conservée sur cet appareil/);
  });
});
