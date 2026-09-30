// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Règle définitive : élève sans signature = accès autorisé (bandeau seulement).
describe("Élève sans signature = accès autorisé", () => {
  const src = readFileSync("src/pages/CoursPublic.tsx", "utf8");
  it("aucun écran bloquant sur signature manquante", () => {
    expect(src).not.toMatch(/if\s*\(\s*needsEmargement\s*\)\s*\{/);
    expect(src).not.toContain("vous devez toutes les régulariser avant d'accéder");
  });
  it("bandeau « Signature en attente » avec bouton Signer", () => {
    expect(src).toContain("bandeau-signature-en-attente");
    expect(src).toContain("Signature en attente");
    expect(src).toContain("{bandeauSignature}");
  });
});
