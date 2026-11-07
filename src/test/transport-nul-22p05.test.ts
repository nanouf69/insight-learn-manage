// @vitest-environment node
// Refus 22P05 (Ahmed MALKI, 05/11 : 97 refus EB1__t3p ; 06/11 : 55 refus EB1__gestion__t2).
// Cause reproduite en base jetable (transport_nul_22p05_contract.py) : un U+0000 dans une
// réponse OU un événement fait refuser tout le lot ; le compactage de la file recopiait
// l'événement fautif dans chaque nouvelle opération, d'où un brouillon serveur figé.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";

if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k) ?? null : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

import { contientNul, decoderTransport, decoderValeurMarquee, encoderTransport, TRANSPORT_ENCODAGE } from "@/lib/transportSansNul";
import {
  classifyAnswerSaveFailure,
  enqueueAnswerSave,
  getBlockedAnswerSaves,
  getPendingAnswerSaves,
  getPendingAnswers,
  setAnswerSaveAuthToken,
  setAnswerSaveOwnership,
} from "@/lib/answerPersistence";

const APP = "11111111-1111-1111-1111-111111111111";
const UID = "22222222-2222-2222-2222-222222222222";
const flush = async (ms = 0) => { await vi.advanceTimersByTimeAsync(ms); await Promise.resolve(); };

describe("Codage de transport sans U+0000", () => {
  it("aller-retour exact sur toutes les combinaisons difficiles (NUL, ␀ littéral, U+034F, emoji)", () => {
    const alphabet = ["\u0000", "\u2400", "\u034F", "a", "é", "😀"];
    let rnd = 7;
    const next = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let n = 0; n < 3000; n++) {
      const s = Array.from({ length: Math.floor(next() * 12) }, () => alphabet[Math.floor(next() * alphabet.length)]).join("");
      const v = { [s]: [s, { q: s }], n: 3, b: null, t: true };
      const e = encoderTransport(v);
      expect(contientNul(e)).toBe(false);
      expect(decoderTransport(e)).toEqual(v);
    }
  });

  it("textes sans NUL ni ␀ : strictement inchangés (aucune altération des réponses existantes)", () => {
    const v = { "1": "Réponse normale 😀", "2": ["A", "C"], "3": { texte: "x" } };
    expect(encoderTransport(v)).toEqual(v);
  });

  it("lecture UI/IA/historique/export préparée : décodage uniquement avec version explicite", () => {
    const texte = "␀␀ et ␀\u034f";
    expect(decoderValeurMarquee(texte, null)).toBe(texte);
    expect(decoderValeurMarquee(texte, undefined)).toBe(texte);
    expect(decoderValeurMarquee(encoderTransport(texte), TRANSPORT_ENCODAGE)).toBe(texte);
    expect(() => decoderValeurMarquee(texte, "version-inconnue")).toThrow("ENCODAGE_VERSION_INCONNUE");
  });

  it("copie serveur identique au module client", () => {
    expect(readFileSync("supabase/functions/upsert-reponse-apprenant/transportSansNul.ts", "utf8")).toBe(readFileSync("src/lib/transportSansNul.ts", "utf8"));
  });

  it("22P05 reste un refus définitif (jamais de renvoi en boucle)", () => {
    expect(classifyAnswerSaveFailure(400, JSON.stringify({ error: "unsupported Unicode escape sequence", code: "22P05" })).definitif).toBe(true);
  });
});

describe("File de réponses : transport codé, original conservé", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    setAnswerSaveAuthToken("test-token", UID);
    setAnswerSaveOwnership({ apprenantId: APP });
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const saisie = { "1": "abc", "2": "texte\u0000invisible" };

  it("codec inactif : caractères littéraux et NUL transmis intacts sans marqueur ; pas de faux succès sur coupure", async () => {
    const valeurs = { "1": "␀␀ et ␀\u034f", "2": saisie["2"] };
    const fetchMock = vi.fn().mockRejectedValue(new Error("coupure réseau fictive"));
    vi.stubGlobal("fetch", fetchMock);
    enqueueAnswerSave({ apprenant_id: APP, user_id: UID, exercice_id: "EB1__gestion__t2", exercice_type: "examen_blanc", reponses: valeurs });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.transport_encodage).toBeUndefined();
    expect(body.reponses).toEqual(valeurs);
    expect(getPendingAnswers(APP, "EB1__gestion__t2")).toEqual(valeurs);
    expect(getPendingAnswerSaves()).toBe(1);
  });

  it("ancien refus définitif : aucun déblocage tant que le contrat complet n'est pas activé", async () => {
    const original = {
      id: "EB1__gestion__t2__op1",
      payload: { apprenant_id: APP, user_id: UID, exercice_id: "EB1__gestion__t2", exercice_type: "examen_blanc", reponses: saisie, base_seq: 2 },
      queued_at: "2026-11-06T21:22:49.000Z", attempts: 55, owner_user_id: UID, blocked: true,
      rejection: { exerciceId: "EB1__gestion__t2", reason: "refused", at: "2026-11-06T21:22:49.000Z" },
    };
    localStorage.setItem("answer_save_queue_v1", JSON.stringify([original]));
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => JSON.stringify({ code: "22P05" }) });
    vi.stubGlobal("fetch", fetchMock);
    enqueueAnswerSave({ apprenant_id: APP, user_id: UID, exercice_id: "autre_exo", exercice_type: "quiz", reponses: { "1": "x" } });
    await flush();
    await flush(60_000);
    expect(fetchMock.mock.calls.map((c) => JSON.parse(c[1].body)).filter((b) => b.exercice_id === "EB1__gestion__t2")).toHaveLength(0);
    expect(getPendingAnswers(APP, "EB1__gestion__t2")).toEqual(saisie);
    expect(getBlockedAnswerSaves()).toBeGreaterThanOrEqual(1);
  });
});
