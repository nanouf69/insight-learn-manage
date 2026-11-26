import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChoixApresQuiz } from "@/components/cours-en-ligne/learnerQuizUi";

describe("choix après quiz initial validé", () => {
  it("avec des fausses : Relire/refaire ET Suivant visibles, rien de lancé automatiquement", () => {
    const relire = vi.fn(), suivant = vi.fn();
    render(<ChoixApresQuiz fausses={3} onRelire={relire} onSuivant={suivant} />);
    expect(relire).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("choix-suivant"));
    expect(suivant).toHaveBeenCalledTimes(1);
    expect(relire).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("choix-relire"));
    expect(relire).toHaveBeenCalledTimes(1);
  });
  it("sans fausse : score + Suivant, aucune reprise proposée", () => {
    render(<ChoixApresQuiz fausses={0} onRelire={() => {}} onSuivant={() => {}} />);
    expect(screen.queryByTestId("choix-relire")).toBeNull();
    expect(screen.getByText(/Aucune question fausse à reprendre/)).toBeTruthy();
    expect(screen.getByTestId("choix-suivant")).toBeTruthy();
  });
  it("dernier quiz : action de fin existante, pas de faux Suivant", () => {
    render(<ChoixApresQuiz fausses={2} onRelire={() => {}} fin={<button>Terminer le module</button>} />);
    expect(screen.queryByTestId("choix-suivant")).toBeNull();
    expect(screen.getByText("Terminer le module")).toBeTruthy();
  });
  it("reprise enregistrée : propose de la reprendre, sans l'ouvrir", () => {
    render(<ChoixApresQuiz fausses={2} repriseEnCours onRelire={() => {}} onSuivant={() => {}} />);
    expect(screen.getByTestId("choix-relire").textContent).toMatch(/Reprendre la correction/);
  });
});

describe("libellé de progression", () => {
  it("affiche « Passer au cours / quiz suivant »", () => {
    render(<ChoixApresQuiz fausses={1} onRelire={() => {}} onSuivant={() => {}} />);
    expect(screen.getByTestId("choix-suivant").textContent).toContain("Passer au cours / quiz suivant");
  });
});
