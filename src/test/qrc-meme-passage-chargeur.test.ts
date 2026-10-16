// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

let fail = "";
const data: Record<string, any[]> = {};
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const q: any = { select: () => q, in: () => q, eq: () => q, range: async () => fail === table ? { data: null, error: new Error("lecture") } : { data: data[table] ?? [], error: null } };
  return q;
} } }));
import { fetchCoreMatiereStates } from "@/lib/coreExamPublication";
import { fetchPassagesV2NonFiables } from "@/lib/passagesV2NonFiables";
import { attacherSourceUnique, noteExamenAffichee } from "@/lib/noteExamenAffichee";

const questions = [{ id: "t3p:1", type: "QRC", enonce: "Q" }];
const row = { id: "r", apprenant_id: "a", quiz_type: "examen_blanc", quiz_id: "EB5", matiere_id: "t3p", completed_at: "2026-09-27T13:28:28Z", score_obtenu: 4, score_max: 20, details: { qrc_pending_correction: true, reponses: { 1: "réponse" }, questions: [{ questionId: 1, type: "QRC", enonce: "Q" }] } };
beforeEach(() => {
  fail = "";
  Object.assign(data, {
    exam_attempts_v2: [{ attempt_id: "att", apprenant_id: "a", exam_id: "EB5", finished_at: "2026-09-27T13:28:27Z", matiere: "t3p", questions }],
    qrc_instances_v2: [{ attempt_id: "att", question_id: "t3p:1", reponse: "réponse", etat: "corrigee", note: 1 }],
    core_exam_results: [{ attempt_id: "att", result_revision: 1, status: "definitif", score: 14.5, total: 20, qrc_restantes: 0 }],
    core_tentatives_neutralisees: [], answer_state: [{ attempt_id: "att", question_id: "t3p:1", valeur: "réponse" }],
    apprenant_quiz_results: [row],
  });
});
async function chargerEtAfficher() {
  const states = await fetchCoreMatiereStates("a");
  const nf = states === null ? null : await fetchPassagesV2NonFiables(new Map([["a", states]]));
  return noteExamenAffichee(attacherSourceUnique(row, states, nf));
}
describe("Chargeur réel mocké : QRC du même passage", () => {
  it("lit le passage, ses réponses et sa QRC corrigée", async () => expect(await chargerEtAfficher()).toMatchObject({ etat: "note", note20: 14.5, source: "noyau" }));
  it("une réponse tronquée garde l'attente historique", async () => {
    data.answer_state = [{ attempt_id: "att", question_id: "t3p:1", valeur: "r" }];
    expect(await chargerEtAfficher()).toMatchObject({ etat: "en_attente", source: "ancien" });
  });
  it("échec de lecture des réponses : non vérifiable", async () => {
    fail = "answer_state";
    expect((await chargerEtAfficher()).etat).toBe("lecture_impossible");
  });
});