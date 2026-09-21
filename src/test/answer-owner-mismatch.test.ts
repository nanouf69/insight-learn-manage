/**
 * 403 auth_user_id_mismatch — la protection reste, le rattachement est corrigé.
 *
 * Cause : en aperçu admin/formateur (CoursPublic embedded), les écrans quiz
 * recevaient l'apprenant_id du dossier consulté alors que la session connectée
 * est celle de l'admin. Chaque interaction mettait en file une réponse qui ne
 * pouvait appartenir qu'à un autre compte → 403 en boucle, file bloquée.
 */
// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";

if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}
import fs from "fs";
import path from "path";
import {
  setAnswerSaveOwnership,
  canQueueAnswerSaveFor,
  enqueueAnswerSave,
  getPendingAnswerSaves,
} from "@/lib/answerPersistence";

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf8");

describe("Propriété des sauvegardes de réponses", () => {
  beforeEach(() => {
    localStorage.clear();
    setAnswerSaveOwnership({ apprenantId: null, previewReadOnly: false });
  });

  it("aucun rattachement connu : aucune écriture ne part avant identification", () => {
    expect(canQueueAnswerSaveFor("apprenant-A")).toBe(false);
  });

  it("session apprenant A : refuse une réponse visant le dossier B", () => {
    setAnswerSaveOwnership({ apprenantId: "apprenant-A" });
    expect(canQueueAnswerSaveFor("apprenant-A")).toBe(true);
    expect(canQueueAnswerSaveFor("apprenant-B")).toBe(false);
  });

  it("aperçu (admin/formateur) : rien n'est mis en file", () => {
    setAnswerSaveOwnership({ previewReadOnly: true });
    enqueueAnswerSave({
      apprenant_id: "apprenant-A",
      exercice_id: "quiz-1",
      exercice_type: "quiz",
      reponses: { q1: "a" },
    } as any);
    expect(getPendingAnswerSaves()).toBe(0);
  });

  it("aperçu : une ancienne réponse en attente n'est jamais envoyée", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("answer_save_queue_v1", JSON.stringify([{
      id: "ancienne-preview",
      payload: {
        apprenant_id: "apprenant-A",
        exercice_id: "quiz-ancien",
        exercice_type: "quiz",
        reponses: { q1: "A" },
      },
      queued_at: new Date().toISOString(),
      attempts: 0,
      owner_user_id: "admin-auth-id",
    }]));

    setAnswerSaveOwnership({ previewReadOnly: true });
    enqueueAnswerSave({
      apprenant_id: "apprenant-A",
      exercice_id: "quiz-nouveau",
      exercice_type: "quiz",
      reponses: { q2: "B" },
    } as any);
    await Promise.resolve();

    expect(fetchMock).not.toHaveBeenCalled();
    const queue = JSON.parse(localStorage.getItem("answer_save_queue_v1") ?? "[]");
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("ancienne-preview");
  });

  it("session apprenant : la réponse est bien mise en file", () => {
    setAnswerSaveOwnership({ apprenantId: "apprenant-A" });
    enqueueAnswerSave({
      apprenant_id: "apprenant-A",
      exercice_id: "quiz-1",
      exercice_type: "quiz",
      reponses: { q1: "a" },
    } as any);
    expect(getPendingAnswerSaves()).toBe(1);
  });

  it("la protection serveur auth_user_id_mismatch n'est jamais retirée", () => {
    const fn = read("supabase/functions/upsert-reponse-apprenant/index.ts");
    expect(fn).toContain("auth_user_id_mismatch");
    expect(fn).toContain("learner.auth_user_id !== effectiveUserId");
  });

  it("les réponses refusées sont conservées, pas supprimées", () => {
    const src = read("src/lib/answerPersistence.ts");
    expect(src).toContain("item.blocked");
    expect(src).toContain("getBlockedAnswerSaves");
  });

  it("l'aperçu apprenant déclare explicitement le mode consultation", () => {
    const src = read("src/pages/CoursPublic.tsx");
    expect(src).toContain("setAnswerSaveOwnership");
    expect(src).toContain("previewReadOnly: !!embedded");
  });
});
