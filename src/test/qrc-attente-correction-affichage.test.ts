// @vitest-environment node
import { describe, it, expect } from "vitest";
import { isQrcPendingCorrection, isQrcCorrectionValidated } from "@/components/cours-en-ligne/exam-helpers";

const adminCorrection = (pts: number) => ({
  pointsObtenus: pts,
  manuel: true,
  validatedByAdmin: true,
  correctedAt: new Date().toISOString(),
  explication: `Correction manuelle par l'administrateur : ${pts}/2 pts`,
});

const autoCorrection = { pointsObtenus: 0, explication: "Aucune réponse." };

const details = (corrections: Record<string, any>) => ({
  qrc_pending_correction: true,
  questions: [
    { questionId: 1, type: "QCM" },
    { questionId: 2, type: "QRC" },
    { questionId: 3, type: "QRC" },
    { questionId: 4, type: "QRC" },
  ],
  correctionsIA: corrections,
});

describe("QRC — publication de la note uniquement après correction complète", () => {
  it("aucune QRC corrigée : matière en attente", () => {
    expect(isQrcPendingCorrection(details({ 2: autoCorrection, 3: autoCorrection, 4: autoCorrection }))).toBe(true);
  });

  it("une seule QRC corrigée : matière toujours en attente", () => {
    expect(isQrcPendingCorrection(details({ 2: adminCorrection(2), 3: autoCorrection, 4: autoCorrection }))).toBe(true);
  });

  it("toutes les QRC corrigées : la note peut être publiée", () => {
    expect(
      isQrcPendingCorrection(details({ 2: adminCorrection(2), 3: adminCorrection(1), 4: adminCorrection(0) })),
    ).toBe(false);
  });

  it("une QRC sans réponse doit quand même être validée par l'admin", () => {
    expect(isQrcPendingCorrection(details({ 2: adminCorrection(2), 3: adminCorrection(1) }))).toBe(true);
  });

  it("les anciens résultats (sans drapeau) gardent leur affichage actuel", () => {
    expect(isQrcPendingCorrection({ questions: [{ questionId: 2, type: "QRC" }], correctionsIA: {} })).toBe(false);
  });

  it("une correction automatique n'est jamais considérée comme validée", () => {
    expect(isQrcCorrectionValidated(autoCorrection)).toBe(false);
    expect(isQrcCorrectionValidated(adminCorrection(1))).toBe(true);
  });

  it("l'ancien format de validation admin reste reconnu", () => {
    expect(
      isQrcCorrectionValidated({
        manuel: true,
        correctedAt: "2026-05-01T10:00:00Z",
        explication: "Validation manuelle (masqué par admin)",
      }),
    ).toBe(true);
  });
});
