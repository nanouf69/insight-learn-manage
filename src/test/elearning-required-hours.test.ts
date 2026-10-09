import { describe, expect, it } from "vitest";
import { HEURES_REQUISES, requiredElearningHours, formatLearningHours } from "@/lib/elearningRequiredHours";

describe("Volume requis e-learning, affichage uniquement", () => {
  it("reprend la formation connue uniquement si le type est absent", () => {
    expect(requiredElearningHours({ formation_choisie: "continue-vtc" })).toBe(14);
    expect(requiredElearningHours({ formation_choisie: "formation-continue-vtc" })).toBe(14);
    expect(requiredElearningHours({ type_apprenant: "vtc", formation_choisie: "vtc-elearning" })).toBe(0);
    expect(requiredElearningHours({ type_apprenant: "continue-taxi" })).toBe(0);
  });
  it("affiche les minutes réelles sans les limiter à l'objectif", () => {
    expect(formatLearningHours(1904 / 60)).toBe("31h44");
    expect(formatLearningHours(35)).toBe("35h00");
  });
  it.each(Object.entries(HEURES_REQUISES))("reprend le parcours %s sans volume contractuel", (type, hours) => {
    expect(requiredElearningHours({ type_apprenant: type, heures_elearning: null, heures_totales: null })).toBe(hours);
  });
  it("conserve la priorité du volume explicite", () => {
    expect(requiredElearningHours({ type_apprenant: "va-e", heures_elearning: 12, heures_totales: 40 })).toBe(12);
  });
  it("conserve la déduction du volume contractuel total", () => {
    expect(requiredElearningHours({ type_apprenant: "va-e", heures_totales: 16, heures_presentiel: 6 })).toBe(10);
  });
  it("normalise le type sans confondre présentiel et e-learning", () => {
    expect(requiredElearningHours({ type_apprenant: " VA-E " })).toBe(7);
    for (const type of ["vtc", "taxi", "va", "ta", "inconnu"]) expect(requiredElearningHours({ type_apprenant: type })).toBe(0);
  });
  it("ne modifie aucun champ de la fiche", () => {
    const row = Object.freeze({ type_apprenant: "va-e", heures_elearning: null, heures_totales: null });
    expect(requiredElearningHours(row)).toBe(7);
    expect(row.heures_elearning).toBeNull();
  });
});