import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } } }));
import { EvaluationCompetencesI21 } from "@/components/formateurs/EvaluationCompetencesI21";
const doc = { statut: "signe", reponses: {}, destinataire_nom: "Fictif TEST" };
const signee = { id: "r1", signed_at: "2026-11-25T18:05:55Z", reponses: { evaluation_i21_version: 1, criteres: {}, commentaire: "" }, preuve: { signe_le_paris: "25/11", pdf_empreinte: "x" } };

HTMLCanvasElement.prototype.getContext = (() => ({ scale() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, clearRect() {}, drawImage() {} })) as any;
HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AAAA";
describe("Évaluation I21 état réel", () => {
  beforeEach(()=>invoke.mockReset());
  it("n'affiche pas de formulaire de signature si une évaluation signée existe", () => {
    render(<EvaluationCompetencesI21 documentId="d" doc={doc} fichiers={[]} reviews={[signee]} onSaved={async () => ({})} />);
    expect(screen.queryByText(/Signer manuscritement/)).toBeNull();
    expect(screen.getByText(/Relire le compte rendu signé/)).toBeTruthy();
  });
  it("n'affiche pas de succès si le serveur ne confirme pas", async () => {
    invoke.mockResolvedValue({ data: { error: "Une évaluation I21 signée existe déjà" }, error: null });
    render(<EvaluationCompetencesI21 documentId="d" doc={doc} fichiers={[]} reviews={[]} onSaved={async () => ({})} />);
    fireEvent.click(screen.getByRole("checkbox"));
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error('Canvas absent');
    fireEvent.mouseDown(canvas, { clientX: 5, clientY: 5 }); fireEvent.mouseMove(canvas, { clientX: 30, clientY: 20 }); fireEvent.mouseUp(canvas);
    const bouton = screen.getByText(/Signer manuscritement/).closest("button");
    if (!bouton) throw new Error('Bouton absent');
    await waitFor(() => expect(bouton.disabled).toBe(false));
    fireEvent.click(bouton);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/existe déjà/));
    expect(screen.queryByText(/confirmée par le serveur/)).toBeNull();
  });
  it('keeps the signed readback visible even when the parent has not rerendered yet',async()=>{
    invoke.mockResolvedValue({data:{success:true,review:{id:signee.id},preuve_i21_id:'proof'},error:null});
    const proof={...signee,preuve:{...signee.preuve,signed_at:signee.signed_at}};
    render(<EvaluationCompetencesI21 documentId="d" doc={doc} fichiers={[]} reviews={[]} onSaved={async()=>({data:{reviews:[proof]}})}/>);
    fireEvent.click(screen.getByRole('checkbox'));
    const canvas=document.querySelector('canvas');if(!canvas)throw Error('Canvas absent');
    fireEvent.mouseDown(canvas,{clientX:5,clientY:5});fireEvent.mouseMove(canvas,{clientX:30,clientY:20});fireEvent.mouseUp(canvas);
    const button=screen.getByRole('button',{name:/Signer manuscritement/});
    fireEvent.click(button);fireEvent.click(button);
    await screen.findByText(/confirmée par le serveur/);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button',{name:/Signer manuscritement/})).toBeNull();
    expect(screen.getByRole('button',{name:'Relire le compte rendu signé'})).toBeTruthy();
  });
});
