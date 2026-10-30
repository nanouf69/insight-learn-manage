import { describe, it, expect } from "vitest";
import { liveCompletionEvidence, withSubmittedModuleProof } from "@/lib/moduleCompletionEvidence";
import { calculerJalonsPonderes } from "@/lib/jalonsPonderes";
import { progressionModulesEleve } from "@/lib/progressionModulesEleve";

const make = (id: number, ex: number, n: number, done: number) => ({
  module_id: id, status: "completed", completed_at: "2026-10-15T11:51:06Z", progress: 100,
  details: Array.from({ length: n }, (_, q) => ({ exerciceId: ex, questionId: q + 1, reponseEleve: q < done ? ["A"] : null })),
});

describe("Riyad: sept modules attribués, sans faux 100%", () => {
  it("les deux preuves incomplètes ne sont ni des modules terminés ni des jalons à 100%", () => {
    const rows = [make(26,1,10,10), make(2,7,66,55), make(3,400,26,26), make(4,100,206,118), make(35,1,0,0), make(5,500,1002,1002), make(8,1,99,99)];
    const before = JSON.stringify(rows);
    const effective = rows.map(liveCompletionEvidence);
    expect(progressionModulesEleve(rows.map(r => ({id:r.module_id,nom:String(r.module_id)})), () => true, new Set(), "2026-10-15", "fictif", rows)).toMatchObject({total:7,termines:5});
    const r = calculerJalonsPonderes("vtc",rows.map(r=>r.module_id),effective,{[-1]:10,2:20,3:10,4:20,35:10,5:10,8:20});
    expect(r.taux).toBeLessThan(100);
    expect(r.lignes.filter(l=>!l.valide).map(l=>l.moduleId)).toEqual([2,4]);
    expect(effective.find(r=>r.module_id===4)?.progress).toBeCloseTo(118/206*100);
    expect(JSON.stringify(rows)).toBe(before);
  });
  it("une soumission serveur entière rétablit le jalon sans modifier la copie", () => {
    const row = make(4,100,206,118);
    const proof = { exercice_id:"module_4_exo_100",status:"submitted",submitted_at:"2026-10-30T15:41:00Z",reponses:Object.fromEntries(Array.from({length:206},(_,q)=>[`100-${q+1}`,["B"]])) };
    expect(liveCompletionEvidence(withSubmittedModuleProof(row,[proof])).status).toBe("completed");
    expect(liveCompletionEvidence(withSubmittedModuleProof(row,[{...proof,status:"in_progress"}])).status).toBe("in_progress");
    expect(row.details[205].reponseEleve).toBeNull();
  });
  it.each([2,10,40,41])("même règle VTC/TAXI/TA/VA %s sans seuil de note", id => {
    expect(liveCompletionEvidence(make(id,1,10,9)).progress).toBe(90);
    expect(liveCompletionEvidence(make(id,1,10,10)).status).toBe("completed");
  });
  it("examens blancs et absence de périmètre récupérable conservent leur circuit", () => {
    expect(liveCompletionEvidence(make(35,1,10,0)).status).toBe("completed");
    const unknown = {module_id:2,status:"completed",progress:100};
    expect(liveCompletionEvidence(unknown)).toBe(unknown);
  });
});