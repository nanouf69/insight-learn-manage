import {describe, expect, it} from "vitest";
import {currentCorrectionFor, parseCurrentCorrection} from "@/lib/examCurrentCorrection";
import type {ExamenBlanc, Question} from "@/components/cours-en-ligne/examens-blancs-data";

const frozen: Question = {id:3,type:"QCM",enonce:'Sur un trajet de 100 km sur autoroute, si je roule à 130 km/h au lieu de 120 km/h, je "gagne" environ :',choix:[{lettre:"A",texte:"10 minutes"},{lettre:"B",texte:"15minutes"},{lettre:"C",texte:"8 minutes",correct:true}]};
const make = (id="EB5", questions:Question[]=[{...frozen,choix:frozen.choix?.map(c=>c.lettre==="C"?{...c,texte:"4 minutes"}:c)}]) => parseCurrentCorrection({updated_at:"2026-11-13T08:25:47.769777Z",module_data:{id,matieres:[{id:"securite",questions}]} as ExamenBlanc},id);
describe("Correction distincte de la copie et des notes",()=>{
  it("Q3 EB5 montre C 4 minutes même si la lettre C est inchangée",()=>{
    const before=JSON.stringify(frozen), source=make();
    const correction=currentCorrectionFor(source,"EB5","securite",frozen);
    expect(correction?.current.choix?.find(c=>c.correct)).toEqual({lettre:"C",texte:"4 minutes",correct:true});
    expect(correction?.contentChanged).toBe(true);
    expect(JSON.stringify(frozen)).toBe(before);
    expect(frozen.choix?.find(c=>c.correct)?.texte).toBe("8 minutes");
  });
  for(const id of ["EB1","EB2","EB3","EB4","EB5","EB6","EB1-TAXI","EB6-TAXI","eb1-ta","eb6-ta","eb1-va","eb6-va"]){
    it(`identité exacte pour ${id}`,()=>{
      expect(currentCorrectionFor(make(id),id,"securite",frozen)).not.toBeNull();
      expect(currentCorrectionFor(make(id),`${id}-autre`,"securite",frozen)).toBeNull();
    });
  }
  it("une autre matière ou question n'est jamais rapprochée par position",()=>{
    expect(currentCorrectionFor(make(),"EB5","gestion",frozen)).toBeNull();
    expect(currentCorrectionFor(make(),"EB5","securite",{...frozen,id:4})).toBeNull();
    expect(currentCorrectionFor(make(),"EB5","securite",{...frozen,id:"securite:3" as unknown as number})).not.toBeNull();
  });
  it("refuse doublons de question, de matière et de lettre",()=>{
    expect(currentCorrectionFor(make("EB5",[frozen,frozen]),"EB5","securite",frozen)).toBeNull();
    const source=make(); source.exam.matieres.push(source.exam.matieres[0]);
    expect(currentCorrectionFor(source,"EB5","securite",frozen)).toBeNull();
    const q={...frozen,choix:[{lettre:"C",texte:"4 minutes",correct:true},{lettre:"C",texte:"8 minutes"}]};
    expect(currentCorrectionFor(make("EB5",[q]),"EB5","securite",frozen)).toBeNull();
  });
  it("un changement de clé multiple reste une correction séparée",()=>{
    const q={...frozen,choix:frozen.choix?.map(c=>({...c,correct:c.lettre!=="B"}))};
    const correction=currentCorrectionFor(make("EB5",[q]),"EB5","securite",frozen);
    expect(correction?.current.choix?.filter(c=>c.correct).map(c=>c.lettre)).toEqual(["A","C"]);
    expect(frozen.choix?.filter(c=>c.correct).map(c=>c.lettre)).toEqual(["C"]);
  });
  it("aucun repli statique sur lecture absente, sans date ou mauvaise identité",()=>{
    expect(()=>parseCurrentCorrection(null,"EB5")).toThrow();
    expect(()=>parseCurrentCorrection({module_data:make().exam},"EB5")).toThrow();
    expect(()=>parseCurrentCorrection({module_data:make().exam,updated_at:"2026-11-13"},"EB4")).toThrow();
  });
  it("Bilans, QRC, corrigé vide et copie inchangée sont exclus",()=>{
    expect(currentCorrectionFor(make("bilan-vtc"),"bilan-vtc","securite",frozen)).toBeNull();
    expect(currentCorrectionFor(make(),"EB5","securite",{...frozen,type:"QRC"})).toBeNull();
    expect(currentCorrectionFor(make("EB5",[frozen]),"EB5","securite",frozen)).toBeNull();
    expect(currentCorrectionFor(make("EB5",[{...frozen,choix:[]}]),"EB5","securite",frozen)).toBeNull();
  });
});