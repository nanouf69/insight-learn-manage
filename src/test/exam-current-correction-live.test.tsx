import {afterEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, render, screen, waitFor} from "@testing-library/react";
const mocks=vi.hoisted(()=>({read:vi.fn(),callback:null as null|(()=>void),remove:vi.fn()}));
vi.mock("@/components/cours-en-ligne/ExamensBlancsEditor",()=>({getModuleIdForExamId:()=>90004}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{
  from:()=>({select:()=>({eq:()=>({maybeSingle:mocks.read})})}),
  channel:()=>({on:(_e:unknown,_f:unknown,cb:()=>void)=>{mocks.callback=cb;return {subscribe:()=>({})};}}),
  removeChannel:mocks.remove,
}}));
import {useExamCurrentCorrection} from "@/hooks/useExamCurrentCorrection";
import {ExamCurrentCorrectionNotice} from "@/components/cours-en-ligne/ExamCurrentCorrectionNotice";
import type {Question} from "@/components/cours-en-ligne/examens-blancs-data";
const q:Question={id:3,type:"QCM",enonce:"130 au lieu de 120",choix:[{lettre:"C",texte:"8 minutes",correct:true}]};
const row=(texte:string)=>({data:{updated_at:"2026-11-13T08:25:47Z",module_data:{id:"EB5",matieres:[{id:"securite",questions:[{...q,choix:[{lettre:"C",texte,correct:true}]}]}]}},error:null});
function Harness({owner="fixture",enabled=true}:{owner?:string;enabled?:boolean}){
  const state=useExamCurrentCorrection("EB5",owner,enabled);
  return <><ExamCurrentCorrectionNotice source={state.source} examId="EB5" subject="securite" frozen={q}/><output>{state.error?"error":state.source?.exam.id??"empty"}</output></>;
}
afterEach(()=>{cleanup();vi.clearAllMocks();mocks.read.mockReset();});
describe("Relecture événementielle des corrections (sans écriture)",()=>{
  it("C 8→4 par événement sans rechargement, snapshot inchangé",async()=>{
    mocks.read.mockResolvedValueOnce(row("8 minutes")).mockResolvedValue(row("4 minutes"));
    render(<Harness/>);
    await waitFor(()=>expect(screen.getByText("EB5")).toBeTruthy());
    act(()=>mocks.callback?.());
    await waitFor(()=>expect(screen.getByText("C — 4 minutes")).toBeTruthy());
    expect(q.choix?.[0].texte).toBe("8 minutes");
    expect(mocks.read).toHaveBeenCalledTimes(2);
  });
  it("ignore une réponse périmée et sérialise la relecture après événement",async()=>{
    let resolve:(value:ReturnType<typeof row>)=>void=()=>{};
    mocks.read.mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValue(row("4 minutes"));
    render(<Harness/>);act(()=>mocks.callback?.());
    await act(async()=>{resolve(row("6 minutes"));});
    await waitFor(()=>expect(screen.getByText("C — 4 minutes")).toBeTruthy());
    expect(screen.queryByText("C — 6 minutes")).toBeNull();
  });
  it("lecture refusée retire le corrigé actuel plutôt que servir une ancienne valeur",async()=>{
    mocks.read.mockResolvedValueOnce(row("4 minutes")).mockResolvedValue({data:null,error:new Error("offline")});
    render(<Harness/>);await screen.findByText("C — 4 minutes");
    act(()=>window.dispatchEvent(new Event("online")));
    await screen.findByText("error");expect(screen.queryByText("C — 4 minutes")).toBeNull();
    expect(q.choix?.[0].texte).toBe("8 minutes");
  });
  it("aucune lecture pendant une épreuve et abonnement retiré à la sortie",async()=>{
    const view=render(<Harness enabled={false}/>);expect(mocks.read).not.toHaveBeenCalled();
    mocks.read.mockResolvedValue(row("4 minutes"));view.rerender(<Harness/>);await screen.findByText("C — 4 minutes");
    view.unmount();expect(mocks.remove).toHaveBeenCalledTimes(1);
  });
  it("changement de compte ignore la lecture de l'ancien compte",async()=>{
    let resolve:(value:ReturnType<typeof row>)=>void=()=>{};
    mocks.read.mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValue(row("4 minutes"));
    const view=render(<Harness owner="first"/>);view.rerender(<Harness owner="second"/>);
    await screen.findByText("C — 4 minutes");await act(async()=>resolve(row("6 minutes")));
    expect(screen.queryByText("C — 6 minutes")).toBeNull();
  });
});