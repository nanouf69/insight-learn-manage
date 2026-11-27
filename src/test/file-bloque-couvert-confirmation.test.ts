// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

if (typeof globalThis.localStorage === "undefined") {
  const s = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (s.has(k) ? s.get(k)! : null),
    setItem: (k: string, v: string) => void s.set(k, v),
    removeItem: (k: string) => void s.delete(k),
    clear: () => s.clear(),
  };
}

import {
  enqueueAnswerSave, flushAnswerSavesAndWait, getBlockedAnswerSavesFor, getBlockedAnswerSaves,
  primeKnownWriteSeq, __testResetMemorySeq, setAnswerSaveAuthToken, setAnswerSaveOwnership,
} from "@/lib/answerPersistence";

const APP = "11111111-1111-1111-1111-111111111111";
const EXO = "module_4_revision_exo_100";

/** Serveur fictif fidèle à persist_answer_batch_v2 (numéro par question, base_seq). */
function serveur(init: Record<string, any>, seq: number) {
  const st = { reponses: { ...init } as Record<string, any>, meta: {} as Record<string, number>, seq };
  Object.keys(init).forEach((k) => (st.meta[k] = seq));
  const fetchMock = vi.fn(async (_u: string, i: RequestInit) => {
    const b = JSON.parse(String(i.body));
    const base = Number(b.base_seq ?? 0), next = st.seq + 1, skipped: string[] = [];
    let applied = false;
    for (const [k, v] of Object.entries(b.reponses ?? {})) {
      if (st.meta[k] == null || st.meta[k] <= base) { st.reponses[k] = v; st.meta[k] = next; applied = true; } else skipped.push(k);
    }
    if (applied) st.seq = next;
    return { ok: true, text: async () => "", json: async () => ({
      success: true, confirmed: true, write_seq: st.seq,
      accepted_event_ids: (b.events ?? []).map((e: any) => e.event_id),
      skipped_questions: skipped, stored_reponses: skipped.length ? { ...st.reponses } : null,
    }) };
  });
  return { st, fetchMock };
}
const save = (r: Record<string, any>) => enqueueAnswerSave({
  apprenant_id: APP, user_id: "22222222-2222-2222-2222-222222222222", module_id: 4,
  exercice_id: EXO, exercice_type: "quiz", reponses: r, completed: false,
} as any);

describe("file : ancien envoi bloqué couvert par une sauvegarde plus récente confirmée", () => {
  beforeEach(() => {
    __testResetMemorySeq(); localStorage.clear();
    setAnswerSaveAuthToken("tok"); setAnswerSaveOwnership({ apprenantId: APP });
  });
  afterEach(() => vi.restoreAllMocks());

  it("D1 : bloqué → rechargement amorcé → correction enregistrée → validation autorisée, trace conservée", async () => {
    const { st, fetchMock } = serveur({ "100-1": ["A"], "100-2": ["B"] }, 3);
    vi.stubGlobal("fetch", fetchMock);
    save({ "100-1": ["C"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(false);
    expect(getBlockedAnswerSavesFor(APP, EXO)).toBe(1);
    expect(st.reponses["100-1"]).toEqual(["A"]); // l'ancien envoi n'a rien écrasé
    primeKnownWriteSeq(APP, EXO, 3);
    save({ "100-1": ["D"], "100-2": ["B"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(true);
    expect(getBlockedAnswerSavesFor(APP, EXO)).toBe(0);
    expect(st.reponses).toEqual({ "100-1": ["D"], "100-2": ["B"] });
    // L'ancien élément reste en file (trace), jamais renvoyé ensuite.
    expect(getBlockedAnswerSaves()).toBe(1);
    const appels = fetchMock.mock.calls.length;
    await flushAnswerSavesAndWait(APP, EXO, 500);
    expect(fetchMock.mock.calls.length).toBe(appels);
    expect(st.reponses["100-1"]).toEqual(["D"]);
  });

  it("garde-fou : un ancien envoi avec une question non couverte reste bloqué et conservé", async () => {
    const { st, fetchMock } = serveur({ "100-1": ["A"], "100-9": ["E"] }, 3);
    vi.stubGlobal("fetch", fetchMock);
    save({ "100-1": ["C"], "100-9": ["B"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(false);
    primeKnownWriteSeq(APP, EXO, 3);
    save({ "100-1": ["D"] }); // 100-9 absente : ne couvre pas l'ancien envoi
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(false);
    expect(getBlockedAnswerSavesFor(APP, EXO)).toBe(1);
    expect(st.reponses).toEqual({ "100-1": ["D"], "100-9": ["E"] }); // rien d'écrasé par l'ancien
  });

  it("garde-fou : une confirmation sur un autre exercice ne débloque rien", async () => {
    const { fetchMock } = serveur({ "100-1": ["A"] }, 3);
    vi.stubGlobal("fetch", fetchMock);
    save({ "100-1": ["C"] });
    await flushAnswerSavesAndWait(APP, EXO, 3000);
    primeKnownWriteSeq(APP, "module_4_revision_exo_101", 3);
    enqueueAnswerSave({ apprenant_id: APP, user_id: "22222222-2222-2222-2222-222222222222", module_id: 4,
      exercice_id: "module_4_revision_exo_101", exercice_type: "quiz", reponses: { "100-1": ["D"] }, completed: false } as any);
    await flushAnswerSavesAndWait(APP, "module_4_revision_exo_101", 3000);
    expect(getBlockedAnswerSavesFor(APP, EXO)).toBe(1);
  });
  it("collision : une question renvoyée par le serveur avec une autre valeur n'est pas couverte, blocage conservé", async () => {
    let n = 0;
    const fetchMock = vi.fn(async (_u: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body)); n += 1;
      const premier = n === 1;
      return { ok: true, text: async () => "", json: async () => ({
        success: true, confirmed: true, write_seq: premier ? 4 : 5,
        accepted_event_ids: (b.events ?? []).map((e: any) => e.event_id),
        skipped_questions: premier ? ["100-1"] : [],
        stored_reponses: premier ? { "100-1": ["A"], "100-9": ["Z"] } : null,
      }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    save({ "100-1": ["C"], "100-9": ["B"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(false);
    expect(getBlockedAnswerSavesFor(APP, EXO)).toBe(1);
    primeKnownWriteSeq(APP, EXO, 4);
    save({ "100-1": ["D"] }); // 100-9 absente, et le serveur avait une autre valeur (Z ≠ B)
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(false);
    expect(getBlockedAnswerSavesFor(APP, EXO)).toBe(1);
  });
});
