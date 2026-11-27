import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn(), from: vi.fn(), auth: { getSession: vi.fn() } } }));
import { supabase } from "@/integrations/supabase/client";
import { tentativeNoyauConfirmee } from "@/lib/confirmationNoyauEB";
import { exigerEtatServeurConcordant, MESSAGE_SYNCHRONISATION_PROGRESSION } from "@/lib/moduleProgressionReadModel";
import { lireRouteBilanFuture, lireResultatRemise } from "@/components/cours-en-ligne/BilanFutureExam";
import { flushToutesFilesAvantDeconnexion, type DepsFlushDeconnexion } from "@/lib/flushAvantDeconnexion";
import { FUTURE_QUEUE_PREFIX } from "@/lib/bilanFutureTransport";

describe("1 — EB V2 : preuve liée à la tentative affichée", () => {
  const base = { apprenantId: "a1", examenId: "eb4", matiereId: "gestion" };
  const affichee = { attempt_id: "T2", apprenant_id: "a1", exam_id: "eb4", snapshot: { matiere: "gestion" } };
  const reponses = { q1: ["A"], q2: ["B"] };
  it("concordance exacte → confirmé", () => {
    expect(tentativeNoyauConfirmee({ ...base, attemptIdAffiche: "T2", tentative: affichee, reponses,
      lignes: [{ question_id: "gestion:q1", valeur: ["A"] }, { question_id: "q2", valeur: ["B"] }] })).toBe(true);
  });
  it("tentative concurrente plus récente (autre attempt_id) → refusé", () => {
    expect(tentativeNoyauConfirmee({ ...base, attemptIdAffiche: "T2", tentative: { ...affichee, attempt_id: "T3" }, reponses,
      lignes: [{ question_id: "q1", valeur: ["A"] }, { question_id: "q2", valeur: ["B"] }] })).toBe(false);
  });
  it("réponse manquante → refusé (même si count suffisait avec une ligne vide)", () => {
    expect(tentativeNoyauConfirmee({ ...base, attemptIdAffiche: "T2", tentative: affichee, reponses,
      lignes: [{ question_id: "q1", valeur: ["A"] }, { question_id: "q9", valeur: [] }] })).toBe(false);
  });
  it("réponse différente → refusé", () => {
    expect(tentativeNoyauConfirmee({ ...base, attemptIdAffiche: "T2", tentative: affichee, reponses,
      lignes: [{ question_id: "q1", valeur: ["A"] }, { question_id: "q2", valeur: ["C"] }] })).toBe(false);
  });
  it("réponse serveur en trop → refusé", () => {
    expect(tentativeNoyauConfirmee({ ...base, attemptIdAffiche: "T2", tentative: affichee, reponses,
      lignes: [{ question_id: "q1", valeur: ["A"] }, { question_id: "q2", valeur: ["B"] }, { question_id: "q3", valeur: ["D"] }] })).toBe(false);
  });
});

describe("2 — jalons et progression : même preuve serveur stricte", () => {
  const row = { module_id: 2, status: "completed", progress: 100, completed_at: "2026-11-26T14:38:00Z" } as any;
  const etat = (status: string) => new Map([[2, { module_id: 2, status, completed_at: "2026-11-26T14:38:00Z", preuve_complete: true, progress_effectif: 100 } as any]]);
  it("état serveur absent → synchronisation", () => {
    expect(() => exigerEtatServeurConcordant([row], new Map())).toThrow(MESSAGE_SYNCHRONISATION_PROGRESSION);
  });
  it("statut différent → synchronisation", () => {
    expect(() => exigerEtatServeurConcordant([row], etat("in_progress"))).toThrow(MESSAGE_SYNCHRONISATION_PROGRESSION);
  });
  it("concordant → preuve serveur attachée", () => {
    const [r] = exigerEtatServeurConcordant([row], etat("completed")) as any[];
    expect(r.preuve_serveur).toBe(true);
    expect(r.progress_preuve).toBe(100);
  });
});

describe("3 — Bilan futur : erreur de lecture ≠ absence", () => {
  it("erreur RPC route → 'erreur', jamais 'legacy'", async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: { code: "57014" } });
    expect(await lireRouteBilanFuture(5)).toBe("erreur");
    (supabase.rpc as any).mockRejectedValueOnce(new Error("réseau"));
    expect(await lireRouteBilanFuture(11)).toBe("erreur");
    (supabase.rpc as any).mockResolvedValueOnce({ data: "legacy", error: null });
    expect(await lireRouteBilanFuture(5)).toBe("legacy");
  });
  it("erreur lecture résultat d'une remise → 'erreur', pas 'non_remise'", async () => {
    expect(await lireResultatRemise(true, async () => ({ data: null, error: { code: "500" } }))).toEqual({ etat: "erreur" });
    expect(await lireResultatRemise(true, async () => ({ data: null, error: null }))).toEqual({ etat: "erreur" });
    expect(await lireResultatRemise(false, async () => { throw new Error("jamais appelé"); })).toEqual({ etat: "non_remise" });
    expect(await lireResultatRemise(true, async () => ({ data: { correct_count: 5, question_count: 7 }, error: null })))
      .toEqual({ etat: "remise", resultat: { correct_count: 5, question_count: 7 } });
  });
});

describe("4 — déconnexion : toutes les files du compte actif", () => {
  const kvDe = (init: Record<string, string>) => {
    const m = new Map(Object.entries(init));
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), keys: () => [...m.keys()], m };
  };
  const draft = (owner: string) => JSON.stringify([{ receiptId: "R", versionId: "V", ownerId: owner, questionId: 1, revision: 1, answer: ["A"], token: "t" }]);
  const deps = (over: Partial<DepsFlushDeconnexion> = {}): DepsFlushDeconnexion => ({
    flushReponses: async () => true, attemptsNoyau: () => [], attemptsDuCompte: async () => [],
    viderNoyau: async () => ({ restantes: 0 }), kv: kvDe({}), saveBilan: async () => ({ error: null }),
    flushNotes: async () => true, notesEnAttente: () => 0, ...over,
  });
  it("files confirmées → ok", async () => {
    const kv = kvDe({ [`${FUTURE_QUEUE_PREFIX}u1:R:V`]: draft("u1") });
    const r = await flushToutesFilesAvantDeconnexion({ userId: "u1", apprenantId: "a1" }, deps({
      kv, attemptsNoyau: () => ["T1", "AUTRE"], attemptsDuCompte: async () => ["T1"],
    }));
    expect(r).toEqual({ ok: true, nonConfirmees: [] });
    expect(kv.m.size).toBe(0);
  });
  it("file non confirmée → refus, files intactes", async () => {
    const kv = kvDe({ [`${FUTURE_QUEUE_PREFIX}u1:R:V`]: draft("u1") });
    const vider = vi.fn(async () => ({ restantes: 2 }));
    const r = await flushToutesFilesAvantDeconnexion({ userId: "u1", apprenantId: "a1" }, deps({
      flushReponses: async () => false, kv, saveBilan: async () => ({ error: { code: "08006", message: "réseau" } }),
      attemptsNoyau: () => ["T1"], attemptsDuCompte: async () => ["T1"], viderNoyau: vider,
    }));
    expect(r.ok).toBe(false);
    expect(r.nonConfirmees).toEqual(["reponses", "examens", "bilans"]);
    expect(kv.m.get(`${FUTURE_QUEUE_PREFIX}u1:R:V`)).toBe(draft("u1"));
  });
  it("propriété des tentatives illisible → refus ; file d'un autre compte ignorée sans envoi", async () => {
    const save = vi.fn(async () => ({ error: null }));
    const kv = kvDe({ [`${FUTURE_QUEUE_PREFIX}u2:R:V`]: draft("u2") });
    const r = await flushToutesFilesAvantDeconnexion({ userId: "u1", apprenantId: "a1" }, deps({
      kv, saveBilan: save, attemptsNoyau: () => ["T1"], attemptsDuCompte: async () => null,
    }));
    expect(r.nonConfirmees).toEqual(["examens"]);
    expect(save).not.toHaveBeenCalled();
    expect(kv.m.size).toBe(1);
  });
  it("notes du compte restées en attente → refus", async () => {
    const r = await flushToutesFilesAvantDeconnexion({ userId: "u1", apprenantId: "a1" }, deps({ notesEnAttente: () => 1 }));
    expect(r.nonConfirmees).toEqual(["notes"]);
  });
});
