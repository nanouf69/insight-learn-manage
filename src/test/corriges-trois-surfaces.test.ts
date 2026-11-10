import { describe, it, expect, vi } from "vitest";
const h = vi.hoisted(() => ({ calls: [] as any[], fail: false }));
vi.mock("@/integrations/supabase/client", () => ({supabase:{rpc:async (_:string,args:any) => {
  h.calls.push(args); return {data:[],error:h.fail ? new Error("lecture refusée") : null};
}}}));
import { indexerSources, lireSources, sourcePour, matierePedagogique, statutPedagogique, type CorrigeSource } from "@/lib/corrigesSources";
import { questionsFaussesDuPassage } from "@/lib/revisionQuestionsFigees";
import { projeterRevisionsAdmin } from "@/features/correction-qrc-v2/revisionsAdmin";
const choices = (correct:string[]) => ["A","B","C"].map(l => ({lettre:l,texte:l,correct:correct.includes(l)}));
const q:any = {id:4,type:"QCM",enonce:"titiller",points:2,choix:choices(["C"])};
const source:CorrigeSource = {source_type:"result",source_id:"copy",exam_id:"EB3",question_id:"francais:4",historique:q,actuelle:{...q,choix:choices(["A","C"])},version:23,publiee_le:"2026-11-10T15:59:36Z",statut:"rapproche"};
describe("Synchronisation officielle séparée des réponses élèves", () => {
  it.each([["A","C"],["C","A"]])("%j = juste avec A+C", (...answer) => expect(statutPedagogique(source, answer)).toBe("juste"));
  it.each([["A"],["C"],["A","B","C"],["B"],[]])("%j = faux sans point partiel", (...answer) => expect(statutPedagogique(source, answer)).toBe("fausse"));
  it("une ancienne réponse juste C devient pédagogiquement fausse sans changer le snapshot ni la note", () => {
    const result:any={resultId:"copy",matiereId:"francais",noteObtenue:2,reponses:{4:["C"]},__core:{questions:[{...q,id:"francais:4"}]}};
    const before=JSON.stringify(result); const m:any={id:"francais",nom:"Français",questions:[q]};
    const current=matierePedagogique(m,result,indexerSources([source]));
    expect(questionsFaussesDuPassage(current,result).fausses.map(f=>f.question.id)).toEqual([4]);
    expect(JSON.stringify(result)).toBe(before); expect(result.noteObtenue).toBe(2);
  });
  it("une réponse auparavant fausse A+C devient juste pédagogiquement et sort de la liste", () => {
    const result:any={resultId:"copy",matiereId:"francais",reponses:{4:["C","A"]},__core:{questions:[{...q,id:"francais:4"}]}};
    const m:any={id:"francais",nom:"Français",questions:[q]};
    expect(questionsFaussesDuPassage(matierePedagogique(m,result,indexerSources([source])),result).fausses).toEqual([]);
  });
  it("ne transfère pas un corrigé vers une autre copie ou matière", () => {
    const map=indexerSources([source]); expect(sourcePour(map,{resultId:"other"},"francais",4)).toBeNull();
    expect(sourcePour(map,{resultId:"copy"},"gestion",4)).toBeNull();
  });
  it("QRC actuel reste distinct : aucune note automatique fabriquée", () => {
    expect(statutPedagogique({...source,actuelle:{...q,type:"QRC",reponseQRC:"texte"}},"texte")).toBe("à vérifier");
  });
  it("un changement de contenu non rapproché ne produit pas de réponse officielle", () => {
    const map=indexerSources([{...source,actuelle:null,statut:"non_rapproche"}]);
    expect(sourcePour(map,{resultId:"copy"},"francais",4)?.actuelle).toBeNull();
  });
  it("la dernière révision admin et l'initiale demeurent deux preuves différentes", () => {
    const row:any={id:"r",apprenant_id:"a",exercice_id:"revision_fausses_EB3",updated_at:"2026-11-10T16:00:00Z",reponses:{revisionState:{examenId:"EB3",answers:{"francais:4":["A","C"]},sourceResultIds:{"francais:4":"copy"}}}};
    const original:any={id:"copy",apprenant_id:"a",quiz_id:"EB3",matiere_id:"francais",tentative:2,details:{snapshot:{questions:[q]},reponses:{4:["B"]}}};
    const [r]=projeterRevisionsAdmin("a",[row],[original],[]);
    expect(r.initiale).toEqual(["B"]);expect(r.derniere).toEqual(["A","C"]);expect(r.matiereId).toBe("francais");
    expect(statutPedagogique(source,r.derniere)).toBe("juste");expect(r.tentative).toBe(2);
  });
  it("lit 121 sources en trois lots sans troncature", async () => {
    h.calls=[];h.fail=false;await lireSources(Array.from({length:61},(_,i)=>`a${i}`),Array.from({length:60},(_,i)=>`r${i}`));
    expect(h.calls).toHaveLength(3);expect(h.calls.flatMap(c=>c.p_attempt_ids)).toHaveLength(61);expect(h.calls.flatMap(c=>c.p_result_ids)).toHaveLength(60);
  });
  it("un lot refusé invalide toute la lecture", async () => {h.fail=true;await expect(lireSources(["a"],[])).rejects.toThrow("lecture refusée");h.fail=false;});
  it("une identité dupliquée est refusée", () => expect(()=>indexerSources([source,source])).toThrow("ambiguë"));
});