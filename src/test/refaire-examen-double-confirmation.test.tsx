import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RefaireExamenDialog } from "@/components/cours-en-ligne/RefaireExamenDialog";

describe("Refaire l'examen — double confirmation", () => {
  it("n'appelle jamais la création de tentative à l'ouverture de la fenêtre", () => {
    const onConfirm = vi.fn();
    render(<RefaireExamenDialog open onOpenChange={() => {}} onConfirm={onConfirm} />);
    expect(screen.getByText(/Attention — Refaire l'examen/)).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("annuler conserve la tentative actuelle (aucune nouvelle tentative)", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<RefaireExamenDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Annuler et conserver ma tentative actuelle"));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("crée la nouvelle tentative uniquement après confirmation explicite", () => {
    const onConfirm = vi.fn();
    render(<RefaireExamenDialog open onOpenChange={() => {}} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Oui, créer une nouvelle tentative"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("un double-clic ne crée jamais deux tentatives", () => {
    const onConfirm = vi.fn();
    render(<RefaireExamenDialog open onOpenChange={() => {}} onConfirm={onConfirm} />);
    const btn = screen.getByText("Oui, créer une nouvelle tentative");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("propose en priorité la reprise quand une tentative est encore reprenable", () => {
    const onConfirm = vi.fn();
    const onResume = vi.fn();
    render(
      <RefaireExamenDialog
        open
        onOpenChange={() => {}}
        hasResumableAttempt
        onResume={onResume}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByText(/tentative en cours, non terminée/)).toBeTruthy();
    fireEvent.click(screen.getByText("▶ Reprendre mon examen"));
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("annonce que les données précédentes restent conservées", () => {
    render(<RefaireExamenDialog open onOpenChange={() => {}} onConfirm={() => {}} />);
    expect(screen.getByText(/resteront conservés dans votre historique/)).toBeTruthy();
  });
});
