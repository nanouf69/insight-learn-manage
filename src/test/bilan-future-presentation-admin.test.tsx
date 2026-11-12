import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { BilanFutureApercuAdmin } from "@/components/cours-en-ligne/BilanFutureApercuAdmin";
describe("présentation admin VTC sans transport élève", () => {
  it("n'appelle aucun RPC lors de navigation et conserve un vrai zéro remis", () => {
    render(<BilanFutureApercuAdmin presentationVtc apercu={{ route: "future", matieres: [500,501,502,503,504].map(exercise_id => ({ exercise_id, submitted: exercise_id === 501 ? { correct_count: 0, question_count: 1 } : null, questions: [{ id: exercise_id, enonce: "Question figée", choix: [{ lettre: "A", texte: "Choix figé" }] }] })) }} />);
    fireEvent.click(screen.getByText("📝 Quiz — Gestion"));
    expect(screen.getByText("Matière remise : 0/1 bonnes réponses")).toBeTruthy();
    expect(document.querySelector('[data-choix="A"]')?.getAttribute("disabled")).not.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});