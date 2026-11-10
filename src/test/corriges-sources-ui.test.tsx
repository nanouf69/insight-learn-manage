import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
vi.mock("@/lib/corrigesSourcesActivation", () => ({CORRIGES_TROIS_SURFACES_ACTIFS:true}));
import { CorrigeSourceNotice } from "@/components/cours-en-ligne/CorrigeSourceNotice";
import type { CorrigeSource } from "@/lib/corrigesSources";
afterEach(cleanup);
const q:any={id:4,type:"QCM",enonce:"titiller",choix:[{lettre:"A",texte:"tracasser",correct:true},{lettre:"B",texte:"interpeller"},{lettre:"C",texte:"taquiner",correct:true}]};
const source:CorrigeSource={source_type:"result",source_id:"copy",exam_id:"EB3",question_id:"francais:4",historique:q,actuelle:q,version:23,publiee_le:"2026-11-10T15:59:36Z",statut:"rapproche"};
describe("Dernier corrigé pédagogique distinct de la note et de la réponse",()=>{
  it("A+C est juste dans le panneau tandis que l'historique reste explicitement séparé",()=>{
    render(<CorrigeSourceNotice source={source} answer={["C","A"]}/>);
    expect(screen.getByText("juste")).toBeTruthy();
    // The value, not presentation, is what is under contract.
    expect(source.actuelle?.choix?.filter(c=>c.correct).map(c=>c.lettre)).toEqual(["A","C"]);
  });
  it("C seule ne devient jamais parfaite avec A+C",()=>{
    render(<CorrigeSourceNotice source={source} answer={["C"]}/>);
    expect(screen.getByText("fausse")).toBeTruthy();
  });
  it("relecture autre version ne change pas la réponse donnée",()=>{
    const answer=["C"];
    const {rerender}=render(<CorrigeSourceNotice source={source} answer={answer}/>);
    expect(screen.getByText("fausse")).toBeTruthy();
    rerender(<CorrigeSourceNotice source={{...source,version:24,actuelle:{...q,choix:q.choix.map((c:any)=>({...c,correct:c.lettre==="C"}))}}} answer={answer}/>);
    expect(screen.getByText("juste")).toBeTruthy();expect(answer).toEqual(["C"]);
  });
});