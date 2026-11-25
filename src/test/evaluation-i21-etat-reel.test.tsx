import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } } }));
import { EvaluationCompetencesI21 } from "@/components/formateurs/EvaluationCompetencesI21";
const doc = { statut: "signe", reponses: {}, destinataire_nom: "Fictif TEST" };
const signee = { id: "r1", signed_at: "2026-11-25T18:05:55Z", reponses: { evaluation_i21_version: 1, criteres: {}, commentaire: "" }, preuve: { signe_le_paris: "25/11", pdf_empreinte: "x" } };

HTMLCanvasElement.prototype.getContext = (() => ({ scale() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, clearRect() {}, drawImage() {} })) as any;
HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AAAA";
describe("Évaluation I21 état réel", () => {
  it("n'affiche pas de formulaire de signature si une évaluation signée existe", () => {
    render(<EvaluationCompetencesI21 documentId="d" doc={doc} fichiers={[]} reviews={[signee]} onSaved={async () => ({})} />);
    expect(screen.queryByText(/Signer manuscritement/)).toBeNull();
    expect(screen.getByText(/Relire le compte rendu signé/)).toBeTruthy();
  });
  it("n'affiche pas de succès si le serveur ne confirme pas", async () => {
    invoke.mockResolvedValue({ data: { error: "Une évaluation I21 signée existe déjà" }, error: null });
    render(<EvaluationCompetencesI21 documentId="d" doc={doc} fichiers={[]} reviews={[]} onSaved={async () => ({})} />);
    fireEvent.click(screen.getByRole("checkbox"));
    const canvas = document.querySelector("canvas")!;
    fireEvent.mouseDown(canvas, { clientX: 5, clientY: 5 }); fireEvent.mouseMove(canvas, { clientX: 30, clientY: 20 }); fireEvent.mouseUp(canvas);
    const bouton = screen.getByText(/Signer manuscritement/).closest("button")!;
    await waitFor(() => expect(bouton.disabled).toBe(false));
    fireEvent.click(bouton);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/existe déjà/));
    expect(screen.queryByText(/confirmée par le serveur/)).toBeNull();
  });
});
