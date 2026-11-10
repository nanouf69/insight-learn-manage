import {describe,it,expect} from "vitest";
import {projeterRevisionsAdmin, type RevisionServeur, type SourceRevision, type EvenementRevision} from "./revisionsAdmin";

const fixture = (exam="EB1", mat="gestion", answer:unknown=["B","A"]) => {
  const key=`${mat}:2`;
  const source:SourceRevision={id:"copy",apprenant_id:"a",quiz_id:exam,matiere_id:mat,matiere_nom:mat,tentative:3,details:{reponses:{2:["C"]},snapshot:{questions:[{id:2,type:Array.isArray(answer)?"QCM":"QRC"}]}}};
  const row:RevisionServeur={id:"r",apprenant_id:"a",exercice_id:`revision_fausses_${exam}__r2`,updated_at:"2026-11-10T10:00:00Z",reponses:{revisionState:{examenId:exam,answers:{[key]:answer},questionOrder:[key],sourceResultIds:{[key]:"copy"}}}};
  const ev:EvenementRevision={id:"e",apprenant_id:"a",exercice_id:row.exercice_id,question_id:key,created_at:"2026-11-10T09:59:00Z",valeur:answer};
  return {row,source,ev,key};
};
describe("Révisions admin : preuve serveur sans écriture",()=>{
  for(const exam of ["EB1","EB2","EB3","EB1-TAXI","EB2-TAXI","EB3-TAXI"]) {
    it(`${exam} QCM dernière valeur persistée, tentative source ≠ tour de révision`,()=>{
      const {row,source,ev}=fixture(exam);
      const [r]=projeterRevisionsAdmin("a",[row],[source],[ev]);
      expect(r.derniere).toEqual(["B","A"]); expect(r.initiale).toEqual(["C"]); expect(r.tentative).toBe(3);expect(r.revision).toBe("2");expect(r.cause).toBeNull();expect(r.heureQuestion).toBe(ev.created_at);
    });
    it(`${exam} QRC texte exact sans normalisation`,()=>{
      const {row,source,ev}=fixture(exam,"t3p"," −10 € NON ");
      expect(projeterRevisionsAdmin("a",[row],[source],[ev])[0].derniere).toBe(" −10 € NON ");
    });
  }
  it("autre élève exclu même ID de question",()=>{const {row,source,ev}=fixture();expect(projeterRevisionsAdmin("b",[row],[source],[ev])).toEqual([]);});
  for(const field of ["apprenant_id","quiz_id","matiere_id"] as const) it(`source contradictoire ${field} refusée`,()=>{
    const {row,source}=fixture();source[field]="autre";const [r]=projeterRevisionsAdmin("a",[row],[source],[]);expect(r.cause).toBe("Copie d’origine non liée");expect(r.initiale).toBeUndefined();expect(r.tentative).toBeNull();
  });
  it("pas de lien historique deviné",()=>{const {row,source}=fixture();(row.reponses as any).revisionState.sourceResultIds={};expect(projeterRevisionsAdmin("a",[row],[source],[])[0].cause).toBe("Copie d’origine non liée");});
  it("clé nue ambiguë entre matières signalée",()=>{const {row,source}=fixture();(row.reponses as any).revisionState.answers={2:"x"};(row.reponses as any).revisionState.questionOrder=["gestion:2","anglais:2"];expect(projeterRevisionsAdmin("a",[row],[source],[])[0].matiere).toBe("À VÉRIFIER");});
  it("événement plus récent ne remplace pas la ligne persistée",()=>{const {row,source,ev}=fixture();ev.valeur=["C"];const [r]=projeterRevisionsAdmin("a",[row],[source],[ev]);expect(r.derniere).toEqual(["B","A"]);expect(r.heureQuestion).toBeNull();});
  it("concurrence à heure identique ne fabrique pas un ordre",()=>{const {row,source,ev}=fixture();expect(projeterRevisionsAdmin("a",[row],[source],[ev,{...ev,id:"e2",valeur:["C"]}])[0].heureQuestion).toBeNull();});
  it("événement après état exclu",()=>{const {row,source,ev}=fixture();ev.created_at="2026-11-10T11:00:00Z";expect(projeterRevisionsAdmin("a",[row],[source],[ev])[0].heureQuestion).toBeNull();});
  it("snapshot absent interdit réponse initiale et tentative supposées",()=>{const {row,source}=fixture();source.details.snapshot={};expect(projeterRevisionsAdmin("a",[row],[source],[])[0].cause).toBe("Question absente ou ambiguë dans le snapshot");});
  it("plusieurs révisions du même EB restent séparées et une clôture sans résultat n'est pas terminée",()=>{const {row,source}=fixture();const newer={...row,id:"r3",exercice_id:"revision_fausses_EB1__r3",completed:true};const out=projeterRevisionsAdmin("a",[row,newer],[source],[]);expect(out).toHaveLength(2);expect(new Set(out.map(r=>r.cle)).size).toBe(2);expect(out.some(r=>r.terminee)).toBe(false);expect(out.find(r=>r.revisionId==="r3")?.cause).toBe("Clôture enregistrée, résultat final non confirmé");});
  it("admin : résultat relu exact confirme la fin sans exiger une note parfaite",()=>{
    const {row,source,key}=fixture();row.completed=true;
    (row.reponses as any).revisionState.correctedQuestions=[key];
    const receipt:SourceRevision={id:"receipt",apprenant_id:"a",quiz_id:"EB1",matiere_id:"",quiz_type:"revision_fausses",score_obtenu:0,score_max:1,
      details:{revision_exercice_id:row.exercice_id,questionOrder:[key],reponses:(row.reponses as any).revisionState.answers}};
    expect(projeterRevisionsAdmin("a",[row],[source,receipt],[])[0].terminee).toBe(true);
    expect(projeterRevisionsAdmin("a",[row],[source,{...receipt,apprenant_id:"other"}],[])[0].terminee).toBe(false);
  });
  it("rechargement et seconde correction relisent la valeur persistée, sans mutation",()=>{const {row,source}=fixture();const before=JSON.stringify({row,source});expect(projeterRevisionsAdmin("a",[row],[source],[])).toEqual(projeterRevisionsAdmin("a",[row],[source],[]));expect(JSON.stringify({row,source})).toBe(before);const second=structuredClone(row);(second.reponses as any).revisionState.answers["gestion:2"]=["A"];expect(projeterRevisionsAdmin("a",[second],[source],[])[0].derniere).toEqual(["A"]);expect((row.reponses as any).revisionState.answers["gestion:2"]).toEqual(["B","A"]);});
});