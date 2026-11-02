import { describe, expect, it } from "vitest";
import { isRoadSafetyCourseExercise } from "@/components/cours-en-ligne/roadSafetyQuestionImage";

describe("Sécurité routière : cadre d'image ciblé", () => {
  it("couvre les quiz 80/81/82 quel que soit le module (VTC 2, TAXI 10, 15, 21)", () => {
    expect(isRoadSafetyCourseExercise({ id: 80, titre: "Sécurité Routière — Partie 1 : Signalisation, Marquages & Priorités" })).toBe(true);
    expect(isRoadSafetyCourseExercise({ id: "81", titre: "Sécurité Routière — Partie 2 : Distances, Priorités avancées & Alcool" })).toBe(true);
    expect(isRoadSafetyCourseExercise({ id: 82, titre: "Sécurité Routière — Partie 3 : Sanctions, Éco-conduite, CT & Permis" })).toBe(true);
  });
  it("exclut les Bilans, examens et autres matières", () => {
    expect(isRoadSafetyCourseExercise({ id: 102, titre: "📙 Bilan Sécurité Routière — Partie 1 + 2 + 3" })).toBe(false);
    expect(isRoadSafetyCourseExercise({ id: 502, titre: "📝 C - Sécurité routière" })).toBe(false);
    expect(isRoadSafetyCourseExercise({ id: 80, titre: "Réglementation — Partie 1" })).toBe(false);
  });
});
