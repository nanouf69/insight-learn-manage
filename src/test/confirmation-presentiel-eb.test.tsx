import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { modeExamenBlancStrict, confirmationPresentielRequise } from "@/lib/confirmationPresentielEB";
import ConfirmationPresentielEB from "@/components/cours-en-ligne/ConfirmationPresentielEB";

describe("mode strict examen blanc", () => {
  it.each(["vtc", "taxi", "ta", "va", "vtc-exam"])("%s = présentiel", (t) => {
    expect(modeExamenBlancStrict({ type_apprenant: t })).toBe("presentiel");
  });
  it.each(["vtc-e", "taxi-e", "ta-e", "va-e", "vtc-elearning", "taxi-elearning"])("%s = e-learning", (t) => {
    expect(modeExamenBlancStrict({ type_apprenant: t })).toBe("elearning");
  });
  it("créneau en ligne = e-learning", () => {
    expect(modeExamenBlancStrict({ type_apprenant: "vtc", creneau_horaire: "En ligne" })).toBe("elearning");
  });
  it("vide ou inconnu = jamais supposé présentiel", () => {
    expect(modeExamenBlancStrict({})).toBe("inconnu");
    expect(modeExamenBlancStrict(null)).toBe("inconnu");
    expect(modeExamenBlancStrict({ type_apprenant: "continue-vtc" })).toBe("inconnu");
  });
});

describe("quand l'écran est exigé", () => {
  it("nouveau passage présentiel non confirmé : oui", () => {
    expect(confirmationPresentielRequise({ mode: "presentiel", passageMode: "new", dejaConfirme: false })).toBe(true);
  });
  it("reprise d'un passage commencé : non", () => {
    expect(confirmationPresentielRequise({ mode: "presentiel", passageMode: "resume", dejaConfirme: false })).toBe(false);
  });
  it("e-learning ou inconnu : non", () => {
    expect(confirmationPresentielRequise({ mode: "elearning", passageMode: "new", dejaConfirme: false })).toBe(false);
    expect(confirmationPresentielRequise({ mode: "inconnu", passageMode: "new", dejaConfirme: false })).toBe(false);
  });
  it("admin ou déjà confirmé : non", () => {
    expect(confirmationPresentielRequise({ mode: "presentiel", passageMode: "new", dejaConfirme: false, isAdmin: true })).toBe(false);
    expect(confirmationPresentielRequise({ mode: "presentiel", passageMode: "new", dejaConfirme: true })).toBe(false);
  });
});

describe("écran de confirmation", () => {
  it("question d'identité, deux cases décochées, bouton actif seulement avec les deux", () => {
    const onConfirm = vi.fn();
    render(<ConfirmationPresentielEB open nom="Mfouemo" prenom="Rodrigue" onConfirm={onConfirm} onCancel={() => {}} />);
    expect(screen.getByTestId("question-compte").textContent).toBe("Êtes-vous bien Rodrigue MFOUEMO ?");
    const bouton = screen.getByRole("button", { name: "Commencer l'examen blanc" });
    const compte = screen.getByRole("checkbox", { name: "Oui, je confirme que c'est bien mon compte." });
    const formateur = screen.getByRole("checkbox", { name: "Oui, mon formateur m'a autorisé à commencer." });
    expect(compte).not.toBeChecked();
    expect(formateur).not.toBeChecked();
    expect(bouton).toBeDisabled();
    fireEvent.click(compte);
    expect(bouton).toBeDisabled();
    fireEvent.click(bouton);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(compte);
    fireEvent.click(formateur);
    expect(bouton).toBeDisabled();
    fireEvent.click(compte);
    expect(bouton).not.toBeDisabled();
    fireEvent.click(bouton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
