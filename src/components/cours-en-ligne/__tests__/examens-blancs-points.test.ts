import { describe, it, expect } from "vitest";
import {
  EXAMENS_BLANCS_VTC,
  EXAMENS_BLANCS_TAXI,
  getPointsParQuestion,
  type ExamenBlanc,
  type Matiere,
} from "../examens-blancs-data";

/**
 * Régression : la somme des points recalculés de chaque matière doit être
 * égale (à epsilon près) à `matiere.noteSur`. Cela détecte les bugs de barème
 * (ex: F(V) sur 40 pts qui divisait les notes par 2, gestion sur 36, etc.).
 */

const EPSILON = 0.01;

function sumPoints(matiere: Matiere): number {
  return (matiere.questions ?? [])
    .filter((q) => q != null && q.type != null)
    .reduce((acc, q) => acc + getPointsParQuestion(matiere.id, q.type, matiere), 0);
}

const ALL_EXAMS: { label: string; exam: ExamenBlanc }[] = [
  ...EXAMENS_BLANCS_VTC.map((exam) => ({ label: `VTC ${exam.id}`, exam })),
  ...EXAMENS_BLANCS_TAXI.map((exam) => ({ label: `TAXI ${exam.id}`, exam })),
];

describe("Barème des examens blancs — somme des points = noteSur", () => {
  it("charge au moins un examen VTC et un examen TAXI", () => {
    expect(EXAMENS_BLANCS_VTC.length).toBeGreaterThan(0);
    expect(EXAMENS_BLANCS_TAXI.length).toBeGreaterThan(0);
  });

  for (const { label, exam } of ALL_EXAMS) {
    describe(label, () => {
      for (const matiere of exam.matieres) {
        it(`${matiere.id} — somme des points ≈ noteSur (${matiere.noteSur})`, () => {
          expect(matiere.noteSur).toBeGreaterThan(0);
          expect(matiere.questions.length).toBeGreaterThan(0);

          const total = sumPoints(matiere);
          const diff = Math.abs(total - matiere.noteSur);

          expect(
            diff <= EPSILON,
            `Matière ${matiere.id} (${label}) : somme des points recalculés = ${total.toFixed(
              3,
            )} mais noteSur = ${matiere.noteSur} (écart ${diff.toFixed(3)})`,
          ).toBe(true);
        });

        it(`${matiere.id} — chaque question a des points > 0`, () => {
          for (const q of matiere.questions) {
            const pts = getPointsParQuestion(matiere.id, q.type, matiere);
            expect(
              pts > 0,
              `Question ${q.id} (${matiere.id} / ${label}) : ${pts} points`,
            ).toBe(true);
          }
        });
      }
    });
  }
});
