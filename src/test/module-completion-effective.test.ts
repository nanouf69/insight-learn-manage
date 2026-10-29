import { describe, expect, it } from "vitest";
import { completionEvidenceAllowsDone, hasRecordedAnswer, withSubmittedModuleProof } from "@/lib/moduleCompletionEvidence";
import { compterQuizModule } from "@/lib/moduleQuizCounter";
import { computeServerCompletedModuleIds, getLearnerModuleDisplayState } from "@/lib/moduleUnlockLogic";
import { progressionModulesEleve } from "@/lib/progressionModulesEleve";

const row = (module_id: number, counts: number[], answered: number[]) => ({ module_id, status: "completed", completed_at: "2026-10-26T09:00:00Z", details: counts.flatMap((n, ex) => Array.from({ length: n }, (_, q) => ({ exerciceId: ex + 1, questionId: q + 1, correct: false, reponseEleve: q < (answered[ex] ?? 0) ? ["B"] : null }))) });
describe("Projection effective sans mutation", () => {
  it.each([[31, [5], [4], 0, 1], [40, [2,2,2,2,2,2], [2,2,2,0,0,0], 3, 6], [64,[10],[9],0,1], [27,[2,2],[2,1],1,2]] as const)("capture module %s : les obligations absentes empêchent Réalisés", (id, total, answers, done, count) => {
    const r = row(id, [...total], [...answers]);
    expect(completionEvidenceAllowsDone(r)).toBe(false);
    expect(compterQuizModule([r], [])).toMatchObject({ completedQuizzes: done, totalQuizzes: count });
    expect(computeServerCompletedModuleIds([r], {}, n => n).has(id)).toBe(false);
    expect(getLearnerModuleDisplayState({ loaded: true, serverCompleted: true, hasProgress: true, obligationsComplete: false }).isDone).toBe(false);
  });
  it("réponses toutes fausses mais toutes remises : completion conservée", () => {
    expect(completionEvidenceAllowsDone(row(31,[5],[5]))).toBe(true);
    expect(compterQuizModule([row(31,[5],[5])],[]).completedQuizzes).toBe(1);
  });
  it("ajout ultérieur exclu du périmètre historique", () => {
    expect(compterQuizModule([row(31,[5],[5])],[{id:"2",label:"Ajout",questionIds:["1"]}])).toMatchObject({ completedQuizzes: 1, totalQuizzes: 1 });
  });
  it("relecture d'une soumission entière : restaure la preuve sans altérer le snapshot", () => {
    const original = row(31,[5],[4]);
    const proof = { exercice_id:"module_31_exo_1", status:"submitted", submitted_at:"2026-10-29T08:00:00Z", reponses:Object.fromEntries([1,2,3,4,5].map(q=>[`1-${q}`,["B"]])) };
    expect(completionEvidenceAllowsDone(withSubmittedModuleProof(original,[proof]))).toBe(true);
    expect(original.details[4].reponseEleve).toBeNull();
    expect(completionEvidenceAllowsDone(withSubmittedModuleProof(original,[{...proof,status:"in_progress"}]))).toBe(false);
    expect(completionEvidenceAllowsDone(withSubmittedModuleProof(original,[{...proof,exercice_id:"module_31_revision_exo_1"}]))).toBe(false);
    expect(completionEvidenceAllowsDone(withSubmittedModuleProof(original,[{...proof,exercice_id:"module_32_exo_1"}]))).toBe(false);
  });
  it("file locale ou compteur complet ne remplace pas validation serveur", () => {
    expect(getLearnerModuleDisplayState({ loaded:true,serverCompleted:false,hasProgress:true,quizStats:{completedQuizzes:6,totalQuizzes:6}}).status).toBe("validation_en_cours");
  });
  it("tableau élève et compteur CRM rejettent les mêmes obligations absentes", () => {
    const r = row(40,[2,2],[2,1]);
    expect(progressionModulesEleve([{id:40,nom:"TA"}],()=>true,new Set(),undefined,"fictif",[r])).toMatchObject({termines:0});
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
  it.each([null,undefined," ",[],{},[""]])("réponse vide %s non prouvée", value => expect(hasRecordedAnswer(value)).toBe(false));
  it.each([1,10,40,41])("quatre parcours : même preuve sans seuil de note, module %s", id => expect(completionEvidenceAllowsDone(row(id,[5],[4]))).toBe(false));
});