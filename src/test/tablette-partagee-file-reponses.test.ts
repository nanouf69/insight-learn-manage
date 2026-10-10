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
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }), refreshSession: async () => ({ data: {}, error: null }) } },
}));

import {
  enqueueAnswerSave,
  getPendingAnswers,
  setAnswerSaveAuthToken,
  setAnswerSaveOwnership,
} from "@/lib/answerPersistence";

const EXO = "module_8_exo_1785332774763";
const queue = () => JSON.parse(localStorage.getItem("answer_save_queue_v1") ?? "[]") as any[];
const login = (l: string) => {
  setAnswerSaveAuthToken(null, null);
  setAnswerSaveOwnership({ apprenantId: null });
  setAnswerSaveAuthToken(`token-${l}`, `user-${l}`);
  setAnswerSaveOwnership({ apprenantId: `app-${l}` });
};

describe("Tablette partagée : file locale liée à l'élève et au quiz", () => {
  let online = false;
  const sent: any[] = [];
  beforeEach(() => {
    localStorage.clear();
    sent.length = 0;
    online = false;
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: any) => {
      if (!online) throw new Error("Failed to fetch");
      const token = String(init.headers.Authorization).replace("Bearer token-", "");
      const body = JSON.parse(init.body);
      if (`app-${token}` !== body.apprenant_id) return { ok: false, status: 403, text: async () => "auth_user_id_mismatch" };
      sent.push({ token, ...body });
      return { ok: true, status: 200, json: async () => ({ success: true, confirmed: true, write_seq: sent.length }) };
    }));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("A hors ligne → B se connecte : réponses de A gardées, jamais montrées à B, jamais envoyées sous B ; A revient : tout remonte", async () => {
    login("A");
    enqueueAnswerSave({ apprenant_id: "app-A", exercice_id: EXO, exercice_type: "quiz", reponses: { "1785332774763-1": ["B"], "1785332774763-2": ["C"] } });
    await vi.advanceTimersByTimeAsync(3000);
    expect(queue()).toHaveLength(1);

    // Changement d'élève sur la même tablette, réseau revenu.
    online = true;
    login("B");
    expect(getPendingAnswers("app-A", EXO)).toBeTruthy(); // toujours conservées localement
    expect(getPendingAnswers("app-B", EXO) ?? {}).toEqual({}); // aucune fuite vers B
    enqueueAnswerSave({ apprenant_id: "app-B", exercice_id: EXO, exercice_type: "quiz", reponses: { "1785332774763-1": ["A"] } });
    await vi.advanceTimersByTimeAsync(40000);
    expect(sent.every((s) => `app-${s.token}` === s.apprenant_id)).toBe(true);
    expect(sent.some((s) => s.apprenant_id === "app-A")).toBe(false);
    expect(queue().filter((i) => i.payload.apprenant_id === "app-A")).toHaveLength(1);

    // A se reconnecte sur la même tablette : ses réponses partent, file vide.
    login("A");
    await vi.advanceTimersByTimeAsync(40000);
    const envoiA = sent.filter((s) => s.apprenant_id === "app-A").at(-1);
    expect(envoiA.reponses).toEqual({ "1785332774763-1": ["B"], "1785332774763-2": ["C"] });
    expect(queue()).toHaveLength(0);
  });

  it("deux élèves, même quiz : files séparées par élève ET par quiz, sans mélange", async () => {
    login("A");
    enqueueAnswerSave({ apprenant_id: "app-A", exercice_id: EXO, exercice_type: "quiz", reponses: { q: ["A"] } });
    enqueueAnswerSave({ apprenant_id: "app-A", exercice_id: "module_8_exo_autre", exercice_type: "quiz", reponses: { q: ["D"] } });
    login("B");
    enqueueAnswerSave({ apprenant_id: "app-B", exercice_id: EXO, exercice_type: "quiz", reponses: { q: ["E"] } });
    await vi.advanceTimersByTimeAsync(2000);
    const q = queue();
    expect(q).toHaveLength(3);
    expect(q.find((i) => i.payload.apprenant_id === "app-A" && i.payload.exercice_id === EXO).payload.reponses).toEqual({ q: ["A"] });
    expect(q.find((i) => i.payload.apprenant_id === "app-B").owner_user_id).toBe("user-B");
  });
});
