// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

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
vi.mock("@/lib/sessionExpiree", () => ({ assurerSessionFraiche: async () => null }));

import { enqueueAnswerSave, flushAnswerSavesAndWait, setAnswerSaveAuthToken, setAnswerSaveOwnership } from "@/lib/answerPersistence";
import { buildExerciceId, buildRevisionExerciceId, isAttemptSubmitted } from "@/lib/quizAttempts";

const src = readFileSync(resolve(__dirname, "../components/cours-en-ligne/ModuleDetailView.tsx"), "utf8");
const jwt = (sub: string) => `h.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.s`;
const login = (l: string) => {
  setAnswerSaveAuthToken(null, null);
  setAnswerSaveOwnership({ apprenantId: null });
  setAnswerSaveAuthToken(jwt(`user-${l}`), `user-${l}`);
  setAnswerSaveOwnership({ apprenantId: `app-${l}` });
};
const MODULES: Array<[number, number]> = [[2, 1], [4, 100], [6, 3], [8, 1785332774763], [26, 2]];
const queue = () => JSON.parse(localStorage.getItem("answer_save_queue_v1") ?? "[]") as any[];

describe("Fiabilité des quiz — modules 2, 4, 6, 8, 26", () => {
  // Serveur fictif : ligne validée figée (comme en production), écriture idempotente par élève+quiz.
  const base = new Map<string, { status: string; reponses: any }>();
  let reseauCoupe = false;
  let appels = 0;
  beforeEach(() => {
    localStorage.clear();
    base.clear();
    reseauCoupe = false;
    appels = 0;
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: any) => {
      appels += 1;
      if (reseauCoupe) throw new Error("Failed to fetch");
      const b = JSON.parse(init.body);
      const k = `${b.apprenant_id}|${b.exercice_id}`;
      const row = base.get(k);
      if (row?.status === "submitted") {
        return { ok: true, status: 200, json: async () => ({ success: true, confirmed: true, frozen: true, write_seq: 1 }) };
      }
      base.set(k, { status: "in_progress", reponses: b.reponses });
      return { ok: true, status: 200, json: async () => ({ success: true, confirmed: true, write_seq: appels }) };
    }));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  for (const [m, exo] of MODULES) {
    it(`module ${m} : réseau coupé puis rétabli, rechargement, réponses confirmées sans doublon`, async () => {
      login("A");
      reseauCoupe = true;
      const id = buildExerciceId(m, exo);
      enqueueAnswerSave({ apprenant_id: "app-A", exercice_id: id, exercice_type: "quiz", reponses: { q1: ["A"] } });
      enqueueAnswerSave({ apprenant_id: "app-A", exercice_id: id, exercice_type: "quiz", reponses: { q1: ["A"], q2: ["B"] } });
      await vi.advanceTimersByTimeAsync(5000);
      expect(queue()).toHaveLength(1); // compacté : une seule sauvegarde en attente, rien perdu
      reseauCoupe = false;
      login("A"); // rechargement de la page
      const p = flushAnswerSavesAndWait("app-A", id);
      await vi.advanceTimersByTimeAsync(40000);
      expect(await p).toBe(true);
      expect(base.get(`app-A|${id}`)?.reponses).toEqual({ q1: ["A"], q2: ["B"] });
      expect(queue()).toHaveLength(0);
    });

    it(`module ${m} : quiz déjà validé refait → révision distincte, ligne validée intacte`, async () => {
      const id = buildExerciceId(m, exo);
      base.set(`app-A|${id}`, { status: "submitted", reponses: { q1: ["OK"] } });
      login("A");
      const rev = buildRevisionExerciceId(m, exo);
      enqueueAnswerSave({ apprenant_id: "app-A", exercice_id: rev, exercice_type: "quiz", reponses: { q1: ["NEW"] } });
      const p = flushAnswerSavesAndWait("app-A", rev);
      await vi.advanceTimersByTimeAsync(10000);
      expect(await p).toBe(true);
      expect(base.get(`app-A|${id}`)).toEqual({ status: "submitted", reponses: { q1: ["OK"] } });
      expect(base.get(`app-A|${rev}`)?.reponses).toEqual({ q1: ["NEW"] });
      expect(isAttemptSubmitted(base.get(`app-A|${id}`) as any)).toBe(true);
    });
  }

  it("deux élèves successifs sur la même tablette, 5 modules : aucun mélange", async () => {
    for (const l of ["A", "B"]) {
      login(l);
      for (const [m, exo] of MODULES) {
        enqueueAnswerSave({ apprenant_id: `app-${l}`, exercice_id: buildExerciceId(m, exo), exercice_type: "quiz", reponses: { q1: [l] } });
      }
      await vi.advanceTimersByTimeAsync(30000);
      console.log("DBG", l, appels, JSON.stringify(queue().map((i) => [i.payload.apprenant_id, i.payload.exercice_id, i.blocked, i.attempts])), [...base.keys()].join(","));
    }
    for (const l of ["A", "B"]) for (const [m, exo] of MODULES) {
      expect(base.get(`app-${l}|${buildExerciceId(m, exo)}`)?.reponses).toEqual({ q1: [l] });
    }
    expect(queue()).toHaveLength(0);
  });
});

describe("Validation finale — protections de l'écran", () => {
  it("verrou synchrone contre le double appui, libéré dans tous les cas", () => {
    expect(src).toContain("validationEnCoursRef.current.has(exo.id)) return;");
    expect(src.match(/validationEnCoursRef\.current\.delete\(exo\.id\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it("complétude contrôlée avant toute validation, résultat seulement après le serveur", () => {
    const clic = src.indexOf("unansweredQcmKeys.push(k)");
    const verrou = src.indexOf("validationEnCoursRef.current.add(exo.id)");
    const submit = src.indexOf("submitQuizAttempt({", verrou);
    const affichage = src.indexOf("afficherResultatValide();", submit);
    expect(clic).toBeGreaterThan(0);
    expect(verrou).toBeGreaterThan(clic);
    expect(affichage).toBeGreaterThan(submit);
  });
  it("trois messages distincts : conservé sur l'écran, connexion expirée, quiz validé", () => {
    expect(src).toContain("n'ont pas encore été confirmées par le serveur");
    expect(src).toContain("Votre connexion a expiré : le serveur ne peut pas valider ce quiz.");
    expect(src).toContain("Quiz validé !");
  });
});
