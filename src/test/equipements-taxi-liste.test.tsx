import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/cours-en-ligne/equipements-taxi-locale/useQuizEquipements", async (orig) => {
  const m: any = await orig();
  return { ...m, useQuizEquipements: () => ({ valeurs: {}, statut: "Suivi chargé", charge: true, busy: false, confirme: false, modifier: vi.fn(), enregistrer: vi.fn(), relire: vi.fn() }) };
});

import { QuizEquipements, SERIE_SANCTIONS } from "@/components/cours-en-ligne/equipements-taxi-locale/CoursQuizEquipementsTaxi";

describe("Équipements TAXI — affichage en liste", () => {
  it("affiche les 20 questions l'une sous l'autre, sans navigation Suivant", () => {
    render(<QuizEquipements compteId="compte-fictif" serie={SERIE_SANCTIONS} />);
    expect(SERIE_SANCTIONS.questions.length).toBe(20);
    for (let i = 1; i <= 20; i++) expect(screen.getByTestId(`equipements-question-${i}`)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Suivant/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Terminer le quiz/ })).toBeDisabled();
  });
});
