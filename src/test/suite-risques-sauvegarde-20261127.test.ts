import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn(), from: vi.fn(), auth: { getSession: vi.fn() } } }));
import { retakeConfirmee } from "@/lib/confirmationNoyauEB";
import { estErreurSynchronisation, exigerEtatServeurConcordant } from "@/lib/moduleProgressionReadModel";
import { flushQueue, futureQueueKey, readRejected } from "@/lib/bilanFutureTransport";

describe("reprise de matière : preuve stricte", () => {
  const t = { attempt_id: "R1", apprenant_id: "a1", exam_id: "EB1", snapshot: { matiere: "gestion" }, etat: "terminee" };
  const base = { attemptId: "R1", apprenantId: "a1", examenId: "EB1", matiereId: "gestion", reponses: { "1": ["A"], "2": ["B"] } };
  const ok = [{ question_id: "gestion:1", valeur: ["A"] }, { question_id: "gestion:2", valeur: ["B"] }];
  it("terminée + ensemble exact → confirmé", () => expect(retakeConfirmee({ ...base, tentative: t, lignes: ok })).toBe(true));
  it("terminée mais réponse manquante → refusé", () => expect(retakeConfirmee({ ...base, tentative: t, lignes: ok.slice(0, 1) })).toBe(false));
  it("terminée mais valeur différente → refusé", () => expect(retakeConfirmee({ ...base, tentative: t, lignes: [ok[0], { question_id: "gestion:2", valeur: ["C"] }] })).toBe(false));
  it("non terminée → refusé", () => expect(retakeConfirmee({ ...base, tentative: { ...t, etat: "en_cours" }, lignes: ok })).toBe(false));
  it("lecture réponses en échec → refusé", () => expect(retakeConfirmee({ ...base, tentative: t, lignes: null })).toBe(false));
  it("autre tentative (concurrente) → refusé", () => expect(retakeConfirmee({ ...base, tentative: { ...t, attempt_id: "R2" }, lignes: ok })).toBe(false));
});

describe("consommateurs des jalons stricts", () => {
  it("erreur de synchronisation reconnaissable", () => {
    let err: unknown;
    try { exigerEtatServeurConcordant([{ module_id: 1, status: "completed" } as any], new Map()); } catch (e) { err = e; }
    expect(estErreurSynchronisation(err)).toBe(true);
    expect(estErreurSynchronisation(new Error("autre"))).toBe(false);
  });
  it("carte : message de synchronisation + Réessayer ; relevé : plus de taux de repli", () => {
    const carte = readFileSync("src/components/crm/apprenant-sections/JalonsPonderesCard.tsx", "utf8");
    expect(carte).toMatch(/estErreurSynchronisation\(calculErreur\)/);
    expect(carte).toMatch(/relireCalcul\(\)/);
    const opt = readFileSync("src/lib/pdf/releveJalonsOption.ts", "utf8");
    expect(opt).toMatch(/throw new JalonsReleveIndisponibles/);
  });
  it("relevé PDF : erreur applicable → exception, jamais null", async () => {
    vi.resetModules();
    vi.doMock("@/lib/releveJalonsGel", () => ({ chargerEtatGel: async () => ({ etat: "actuel" }) }));
    vi.doMock("@/lib/jalonsPedagogiques", () => ({ formationJalonsElearning: () => "vtc-e", chargerCalculJalons: async () => { throw new Error("Progression en cours de synchronisation — veuillez réessayer."); } }));
    const { chargerJalonsReleve, JalonsReleveIndisponibles } = await import("@/lib/pdf/releveJalonsOption");
    await expect(chargerJalonsReleve({ id: "a1", date_debut_formation: "2026-11-01", type_apprenant: "vtc-e" })).rejects.toBeInstanceOf(JalonsReleveIndisponibles);
    vi.doUnmock("@/lib/releveJalonsGel"); vi.doUnmock("@/lib/jalonsPedagogiques");
  });
});

describe("sortie alternative : même barrière", () => {
  it("la sortie « appareil déjà connecté » passe par flushToutesFilesAvantDeconnexion avant signOut", () => {
    const src = readFileSync("src/pages/CoursPublic.tsx", "utf8");
    const i = src.indexOf('signOut({ scope: "local" })');
    const avant = src.slice(Math.max(0, i - 700), i);
    expect(avant).toMatch(/flushToutesFilesAvantDeconnexion/);
    expect(avant).toMatch(/if \(!flush\.ok\)[\s\S]*return;/);
  });
});

describe("Bilan futur : refus définitif conservé", () => {
  const m = new Map<string, string>();
  const kv = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  const r = { ownerId: "u1", passageId: "P", versionId: "V", moduleId: 5, exerciseId: 1 };
  it("réponse refusée retirée de l'envoi mais archivée intacte", async () => {
    const d = { receiptId: "P", versionId: "V", ownerId: "u1", questionId: 3, revision: 2, answer: ["B"], token: "tk" };
    m.set(futureQueueKey(r), JSON.stringify([d]));
    const res = await flushQueue(kv, r, async () => ({ error: { code: "P0492", message: "remis" } }));
    expect(res.pending).toBe(0);
    expect(res.rejected).toHaveLength(1);
    const arch = readRejected(kv, r);
    expect(arch).toHaveLength(1);
    expect(arch[0]).toMatchObject({ questionId: 3, answer: ["B"], code: "P0492" });
  });
  it("archivage impossible → la file reste intacte", async () => {
    const d = { receiptId: "P", versionId: "V", ownerId: "u1", questionId: 4, revision: 1, answer: ["C"], token: "tk2" };
    const store = new Map<string, string>([[futureQueueKey(r), JSON.stringify([d])]]);
    const kv2 = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { if (k.startsWith("bilan-future-rejets")) throw new Error("quota"); store.set(k, v); }, removeItem: (k: string) => void store.delete(k) };
    const res = await flushQueue(kv2, r, async () => ({ error: { code: "P0491", message: "x" } }));
    expect(res.pending).toBe(1);
  });
});
