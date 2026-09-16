// @vitest-environment node
import { describe, it, expect } from "vitest";
import { isQrcPendingCorrection } from "@/components/cours-en-ligne/exam-helpers";

/**
 * Parcours examen blanc — vérifications côté application (aucune donnée réelle).
 */
describe("Examen blanc — QRC en attente de correction (Admin = apprenant)", () => {
  const details = (validated: boolean) => ({
    qrc_pending_correction: true,
    questions: [
      { questionId: "q1", type: "QCM" },
      { questionId: "qrc1", type: "QRC" },
    ],
    correctionsIA: { qrc1: { validatedByAdmin: validated } },
  });

  it("reste en attente tant que l'admin n'a pas validé la QRC", () => {
    expect(isQrcPendingCorrection(details(false))).toBe(true);
  });

  it("devient définitif après validation admin", () => {
    expect(isQrcPendingCorrection(details(true))).toBe(false);
  });

  it("n'affecte pas les anciens résultats sans le drapeau", () => {
    expect(isQrcPendingCorrection({ questions: [{ questionId: "qrc1", type: "QRC" }] })).toBe(false);
  });

  it("une matière sans QRC n'est jamais en attente", () => {
    expect(
      isQrcPendingCorrection({ qrc_pending_correction: true, questions: [{ questionId: "q1", type: "QCM" }] })
    ).toBe(false);
  });
});
