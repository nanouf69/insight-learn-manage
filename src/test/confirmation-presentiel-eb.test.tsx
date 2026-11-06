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
  it("affiche l'identité, case non cochée, bouton désactivé puis actif", () => {
    const onConfirm = vi.fn();
    render(<ConfirmationPresentielEB open nom="Mfouemo" prenom="Rodrigue" onConfirm={onConfirm} onCancel={() => {}} />);
    expect(screen.getByTestId("identite-compte").textContent).toBe("Rodrigue MFOUEMO");
    const bouton = screen.getByRole("button", { name: "Commencer l'examen blanc" });
    expect(bouton).toBeDisabled();
    fireEvent.click(bouton);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(bouton).not.toBeDisabled();
    fireEvent.click(bouton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
