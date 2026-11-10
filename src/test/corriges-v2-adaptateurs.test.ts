import { describe, it, expect, vi } from "vitest";
const h = vi.hoisted(() => ({ pages: [] as any[], calls: [] as any[] }));
vi.mock("@/integrations/supabase/client", () => ({supabase:{rpc:async (_:string,args:any) => { h.calls.push(args); return h.pages.shift() ?? {data:[],error:null}; }}}));
import { lireSourcesCopies, questionsARefaire, separerSources, statutPedagogique, type CorrigeSource } from "@/lib/corrigesSources";
import { decisionApresConflit, decouperLots, normaliserRefs, type RevisionVersionnee } from "@/lib/revisionCorrigeVersionnee";
import { agreger, auditerCircuit } from "@/features/correction-qrc-v2/CouvertureCorrigesAdmin";
import { lireSessionsAdmin } from "@/features/correction-qrc-v2/RevisionsVersionneesAdmin";

const choix=(c:string[])=>["A","B","C"].map(l=>({lettre:l,texte:l,correct:c.includes(l)}));
const src=(o:Partial<CorrigeSource>):CorrigeSource=>({source_type:"bilan_snapshot",source_id:"s1",exam_id:"module_5_exo_500",question_id:"u1",position:1,
  historique:{id:1,type:"QCM",enonce:"x",choix:choix(["C"])} as any,actuelle:{id:1,type:"QCM",enonce:"x",choix:choix(["A","C"])} as any,
  version:null,publiee_le:null,statut:"rapproche",raison:null,...o});

describe("Adaptateurs Bilans / examens et corrigé actuel", () => {
  it("QCM tout-ou-rien : A+C exact seul juste, quel que soit l'ordre", () => {
    expect(statutPedagogique(src({}),["C","A"])).toBe("juste");
    for (const a of [["A"],["C"],["A","B","C"],["B"],[]]) expect(statutPedagogique(src({}),a)).toBe("fausse");
  });
  it("questions à refaire = réponse initiale fausse selon le corrigé ACTUEL ; non rapprochées listées à part", () => {
    const r=questionsARefaire([
      src({question_id:"u1",position:2,reponse_initiale:["C"]}),          // juste avant, fausse maintenant -> à refaire
      src({question_id:"u2",position:1,reponse_initiale:["A","C"]}),      // fausse avant, juste maintenant -> sort
      src({question_id:"u3",position:3,actuelle:null,statut:"non_rapproche",raison:"contenu_modifie"}),
    ]);
    expect(r.refaire.map(s=>s.question_id)).toEqual(["u1"]);
    expect(r.nonRapprochees.map(s=>s.raison)).toEqual(["contenu_modifie"]);
  });
  it("une ligne « rapprochée » sans corrigé ou avec raison est refusée (jamais inventée)", () => {
    expect(()=>separerSources([src({actuelle:null})])).toThrow("non prouvé");
    expect(()=>separerSources([src({raison:"contenu_modifie"})])).toThrow("non prouvé");
  });
  it("lecture exhaustive par 50 copies : copie absente = inaccessible signalée, copie sans questions = raison", async () => {
    h.calls=[];h.pages=[
      {data:[{source_type:"result",source_id:"r0",exam_id:"EB1",question_id:null,statut:"non_rapproche",raison:"sans_snapshot"}],error:null},
      {data:[],error:null}];
    const copies=Array.from({length:60},(_,i)=>({type:"result" as const,id:`r${i}`}));
    const out=await lireSourcesCopies([...copies,copies[0]]);
    expect(h.calls.map(c=>c.p_copies.length)).toEqual([50,10]);
    expect(out.copies.map(c=>c.raison)).toEqual(["sans_snapshot"]);
    expect(out.inaccessibles).toHaveLength(59);
  });
  it("lots : >400 questions découpées sans perte ni doublon, une copie reste groupée", () => {
    const refs=Array.from({length:9},(_,c)=>Array.from({length:70},(_,q)=>({type:"attempt" as const,id:`c${c}`,question:`m:${q}`}))).flat();
    const lots=decouperLots([...refs,...refs.slice(0,5)]);
    expect(lots.flat()).toHaveLength(630);
    expect(new Set(lots.flat().map(r=>r.id+r.question)).size).toBe(630);
    expect(lots.every(l=>l.length<=400)).toBe(true);
    for (const l of lots) for (const id of new Set(l.map(r=>r.id))) expect(lots.filter(x=>x.some(r=>r.id===id))).toHaveLength(1);
    expect(normaliserRefs([{type:"result",id:"b",question:"1"},{type:"attempt",id:"a",question:"2"}])[0].type).toBe("attempt");
  });
  it("conflit deux onglets : renvoi seulement si la réponse serveur est celle de départ", () => {
    const fresh={answers:{k:["B"]}} as unknown as RevisionVersionnee;
    expect(decisionApresConflit(fresh,"k",["B"],["A","C"])).toBe("renvoyer");
    expect(decisionApresConflit(fresh,"k",undefined,["A","C"])).toBe("conflit");
    expect(decisionApresConflit(fresh,"k",["C"],["B"])).toBe("deja_identique");
  });
  it("audit de couverture : pagination sans doublon, annulation = aucun résultat", async () => {
    const pages=[{data:{items:[{source_id:"1",exam_id:"EB2",questions:3,rapprochees:0,raisons:{sans_publication:3}}],next:"1"},error:null},
      {data:{items:[{source_id:"2",exam_id:"EB3",questions:2,rapprochees:2,raisons:{}}],next:null},error:null}];
    const b=await auditerCircuit("attempt",()=>{},()=>false,async()=>pages.shift() as any);
    expect([b.copies,b.questions,b.rapprochees,b.raisons.sans_publication]).toEqual([2,5,2,3]);
    const dup=[{data:{items:[{source_id:"1"}],next:"1"},error:null},{data:{items:[{source_id:"1"}],next:null},error:null}];
    await expect(auditerCircuit("attempt",()=>{},()=>false,async()=>dup.shift() as any)).rejects.toThrow("Doublon");
    await expect(auditerCircuit("attempt",()=>{},()=>true,async()=>({data:null,error:null}) as any)).rejects.toThrow("annule");
    expect(agreger([]).copies).toBe(0);
  });
  it("lecteur admin : toutes les pages de 20 sessions, identité vérifiée", async () => {
    const mk=(n:number,o="o")=>Array.from({length:n},(_,i)=>({session_id:`s${n}-${i}`,owner_id:o,refs:[],submission:null,answers:[]}));
    const pages=[{data:mk(20),error:null},{data:mk(3),error:null}];
    expect(await lireSessionsAdmin("o",async()=>pages.shift() as any)).toHaveLength(23);
    await expect(lireSessionsAdmin("o",async()=>({data:mk(1,"x"),error:null}) as any)).rejects.toThrow("Identité");
  });
});
