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

import {
  enqueueAnswerSave,
  flushAnswerSavesAndWait,
  getBlockedAnswerSavesFor,
  primeKnownWriteSeq,
  setAnswerSaveAuthToken,
  setAnswerSaveOwnership,
} from "@/lib/answerPersistence";

const APP = "11111111-1111-1111-1111-111111111111";
const EXO = "module_4_revision_exo_101";

/** Serveur simulé fidèle à persist_answer_batch_v2 (seq par question, base_seq). */
function serveur(initial: Record<string, any>) {
  const st = { reponses: { ...initial } as Record<string, any>, meta: {} as Record<string, number>, seq: 1, appliquees: 0 };
  Object.keys(initial).forEach((k) => (st.meta[k] = 1));
  const fetchMock = vi.fn(async (_u: string, init: RequestInit) => {
    const b = JSON.parse(String(init.body));
    const base = Number(b.base_seq ?? 0);
    const next = st.seq + 1;
    const skipped: string[] = [];
    let applied = false;
    for (const [k, v] of Object.entries(b.reponses ?? {})) {
      if (st.meta[k] == null || st.meta[k] <= base) { st.reponses[k] = v; st.meta[k] = next; applied = true; }
      else skipped.push(k);
    }
    if (applied) { st.seq = next; st.appliquees += 1; }
    return {
      ok: true,
      json: async () => ({
        success: true, confirmed: true, write_seq: st.seq,
        accepted_event_ids: (b.events ?? []).map((e: any) => e.event_id),
        skipped_questions: skipped,
        stored_reponses: skipped.length ? { ...st.reponses } : null,
      }),
      text: async () => "",
    };
  });
  return { st, fetchMock };
}

const save = (reponses: Record<string, any>) =>
  enqueueAnswerSave({
    apprenant_id: APP, user_id: "22222222-2222-2222-2222-222222222222", module_id: 4,
    exercice_id: EXO, exercice_type: "quiz", reponses, completed: false,
  } as any);

describe("Révision « refaire les fausses » : validation après réouverture (cas Barry Alpha)", () => {
  beforeEach(() => {
    localStorage.clear();
    setAnswerSaveAuthToken("tok");
    setAnswerSaveOwnership({ apprenantId: APP });
  });
  afterEach(() => vi.restoreAllMocks());

  it("reproduit : sans numéro serveur connu, la correction est ignorée et la validation échoue", async () => {
    const { st, fetchMock } = serveur({ "101-42": ["C"], "101-48": ["D"] });
    vi.stubGlobal("fetch", fetchMock);
    save({ "101-42": ["B"], "101-48": ["D"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(false);
    expect(getBlockedAnswerSavesFor(APP, EXO)).toBe(1);
    expect(st.reponses["101-42"]).toEqual(["C"]); // rien écrasé
  });

  it("corrigé : la ligne relue amorce la base, la correction est enregistrée et la validation passe", async () => {
    const { st, fetchMock } = serveur({ "101-42": ["C"], "101-48": ["D"] });
    vi.stubGlobal("fetch", fetchMock);
    // Ancien envoi bloqué resté dans la file de l'appareil
    save({ "101-42": ["B"], "101-48": ["D"] });
    await flushAnswerSavesAndWait(APP, EXO, 3000);
    expect(getBlockedAnswerSavesFor(APP, EXO)).toBe(1);
    // Rechargement : lecture serveur (write_seq = 1) puis clic « Valider »
    primeKnownWriteSeq(APP, EXO, 1);
    save({ "101-42": ["B"], "101-48": ["D"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(true);
    expect(getBlockedAnswerSavesFor(APP, EXO)).toBe(0);
    expect(st.reponses).toEqual({ "101-42": ["B"], "101-48": ["D"] });
    // Idempotence : nouveau clic identique, même résultat, aucun blocage
    save({ "101-42": ["B"], "101-48": ["D"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(true);
    expect(st.reponses).toEqual({ "101-42": ["B"], "101-48": ["D"] });
  });

  it("cas Ahmed : réponse modifiée après le blocage, rechargement → enregistrée, aucune question locale perdue", async () => {
    const { st, fetchMock } = serveur({ "102-1": ["A"], "102-2": ["B"] });
    st.meta["102-1"] = 5; st.meta["102-2"] = 5; st.seq = 5;
    vi.stubGlobal("fetch", fetchMock);
    primeKnownWriteSeq(APP, EXO, 3); // numéro local périmé
    save({ "102-1": ["C"], "102-9": ["D"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(false);
    // Rechargement : relecture serveur write_seq = 5, puis l'élève change encore 102-1
    primeKnownWriteSeq(APP, EXO, 5);
    save({ "102-1": ["A", "C"], "102-2": ["B"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(true);
    expect(getBlockedAnswerSavesFor(APP, EXO)).toBe(0);
    expect(st.reponses).toEqual({ "102-1": ["A", "C"], "102-2": ["B"], "102-9": ["D"] });
  });

  it("protection conservée : une écriture d'un autre appareil après la lecture n'est jamais écrasée", async () => {
    const { st, fetchMock } = serveur({ "101-42": ["C"] });
    vi.stubGlobal("fetch", fetchMock);
    primeKnownWriteSeq(APP, EXO, 1);
    st.reponses["101-42"] = ["A"]; st.meta["101-42"] = 2; st.seq = 2; // autre appareil
    save({ "101-42": ["B"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(false);
    expect(st.reponses["101-42"]).toEqual(["A"]);
  });

  it("l'amorçage ne fait jamais reculer un numéro déjà connu", async () => {
    const { st, fetchMock } = serveur({ "101-42": ["C"] });
    vi.stubGlobal("fetch", fetchMock);
    primeKnownWriteSeq(APP, EXO, 1);
    save({ "101-42": ["B"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(true);
    primeKnownWriteSeq(APP, EXO, 0);
    primeKnownWriteSeq(APP, EXO, 1); // valeur lue plus ancienne
    save({ "101-42": ["D"] });
    expect(await flushAnswerSavesAndWait(APP, EXO, 3000)).toBe(true);
    expect(st.reponses["101-42"]).toEqual(["D"]);
  });
});
