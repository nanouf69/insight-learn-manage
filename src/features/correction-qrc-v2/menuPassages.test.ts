import { describe, expect, it } from "vitest";
import { groupeTousPassages, libellePassage, numeroTentative, texteSourceExact } from "./menuPassages";
import { lirePagesParalleles, type GroupeSessionCrm, type TentativeReelle } from "./noyauReel";
const group = (cle:string, ids:string[]):GroupeSessionCrm => ({cle,type:"crm",libelle:cle,periode:null,debut:null,fin:null,tri:"",nbCandidats:1,examens:[{cle:cle+"::EB3-TAXI",exam_id:"EB3-TAXI",date:"01/11/2026",jour:"2026-11-01",heureMin:"18:15",heureMax:"21:21",circuit:"v2",attemptIds:ids,dates:[{jour:"2026-11-01",date:"01/11/2026",heureMin:"18:15",heureMax:"18:15",attemptIds:ids.filter(i=>i!=="t2")},{jour:"2026-11-09",date:"09/11/2026",heureMin:"21:21",heureMax:"21:21",attemptIds:ids.filter(i=>i==="t2")}],apprenantParAttempt:Object.fromEntries(ids.map(i=>[i,"chemoun-fixture"]))}]});
describe("menu tous passages",()=>{
 it("copies anciennes et récentes distinctes, inscriptions croisées sans doublon",()=>{
  const all=groupeTousPassages([group("day",["t1","t2"]),group("cross",["t1","t2"])]);
  expect(all.examens[0].attemptIds).toEqual(["t1","t2"]);
  expect(all.examens[0].dates.map(d=>d.attemptIds)).toEqual([["t1"],["t2"]]);
 });
 it("toutes filières et anciens circuits restent séparés par EB/circuit",()=>{
  const g=group("session",["t1"]);
  g.examens=["EB1","EB1-TAXI","EB1-ta","EB1-va"].flatMap(exam_id=>["v2","ancien"].map(circuit=>({...g.examens[0],exam_id,circuit:circuit as "v2"|"ancien",attemptIds:[`${exam_id}:${circuit}`]})));
  expect(groupeTousPassages([g]).examens).toHaveLength(8);
 });
 it("lecture de 2507 éléments au-delà d’une page, erreur jamais silencieuse",async()=>{
  const rows=Array.from({length:2507},(_,i)=>i);const calls:number[]=[];
  const read=await lirePagesParalleles(async de=>{calls.push(de);return {data:rows.slice(de,de+1000),error:null};},1);
  expect(read).toHaveLength(2507);expect(read[2506]).toBe(2506);expect(calls).toEqual([0,1000,2000]);
  await expect(lirePagesParalleles(async()=>({data:null,error:new Error("refus")}),1)).rejects.toThrow("refus");
 });
 it("date, heure, tentative et ID sont visibles, aucun numéro inventé",()=>{
  const t={candidat:"Chemoun FICTIF",attempt_id:"t1",finished_at:"2026-11-01T17:15:42Z",snapshot:{source_historique:{tentative:1}}} as unknown as TentativeReelle;
  expect(libellePassage(t)).toContain("01/11/2026");expect(libellePassage(t)).toContain("18:15:42");expect(libellePassage(t)).toContain("tentative 1 · t1");
  expect(numeroTentative({snapshot:{} as TentativeReelle["snapshot"]})).toBe("non enregistrée");
 });
 it("les réponses t1 et t2 proviennent de leur propre source figée, jamais de dernière fiche",()=>{
  const s=(id:string,reponse:string)=>({source_historique:{result_id:id,details:{reponses:{"1":reponse}}}});
  expect(texteSourceExact(s("complete","réponse complète"),"1")).toBe("réponse complète");
  expect(texteSourceExact(s("partial","3.5 t"),"1")).toBe("3.5 t");
  expect(texteSourceExact({reponses:{"1":"autre tentative"}},"1")).toBeNull();
 });
});