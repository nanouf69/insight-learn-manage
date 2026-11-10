import {beforeEach,describe,it,expect,vi} from "vitest";
const h=vi.hoisted(()=>({calls:[] as any[],fail:false}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:(table:string)=>{
 const filters:Record<string,unknown>={}; let start=0;
 const q:any={select:()=>q,eq:(k:string,v:unknown)=>{filters[k]=v;return q;},ilike:()=>q,order:()=>q,range:(s:number)=>{start=s;return q;},then:(resolve:any)=>{
 h.calls.push({table,filters:{...filters},start});
 const r={id:"r",apprenant_id:"a",exercice_id:"revision_fausses_EB3-TAXI",reponses:{revisionState:{examenId:"EB3-TAXI",answers:{"gestion:1":"Texte"},questionOrder:["gestion:1"],sourceResultIds:{"gestion:1":"copy"}}},updated_at:"2026-11-10T10:00:00Z"};
 return Promise.resolve(h.fail?{data:null,error:new Error("read refused")}:{error:null,data:table==="reponses_apprenants"?[r]:table==="apprenant_quiz_results"?[{id:"copy",apprenant_id:"a",quiz_id:"EB3-TAXI",matiere_id:"gestion",tentative:1,details:{reponses:{1:"Initial"},snapshot:{questions:[{id:1,type:"QRC"}]}}}]:[]}).then(resolve);
 }};return q;
}}}));
import {lireRevisionsAdmin} from "./lectureRevisionsAdmin";
beforeEach(()=>{h.calls=[];h.fail=false;});
describe("Lecture serveur des révisions admin",()=>{
 it("chaque lecture est filtrée par élève et les événements par révision",async()=>{
 const rows=await lireRevisionsAdmin("a");expect(rows[0].initiale).toBe("Initial");expect(rows[0].derniere).toBe("Texte");expect(h.calls).toHaveLength(3);expect(h.calls.every(c=>c.filters.apprenant_id==="a")).toBe(true);expect(h.calls.find(c=>c.table==="reponses_apprenants_journal").filters.exercice_id).toBe("revision_fausses_EB3-TAXI");
 });
 it("un refus de lecture ne devient jamais une liste vide rassurante",async()=>{h.fail=true;await expect(lireRevisionsAdmin("a")).rejects.toThrow("read refused");});
});