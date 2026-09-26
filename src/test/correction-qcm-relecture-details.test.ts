// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { relireDetailsFiche, pointsQRCDepuisDetails } from "@/lib/correctionQCMAdminMarqueur";

/** Reproduit l'enchaînement de CorrectionQCMTab : relecture puis écriture seulement si ok. */
async function enregistrer(lire: Parameters<typeof relireDetailsFiche>[0], ecrire: (d: unknown) => void) {
  const r = await relireDetailsFiche(lire);
  if (!r.ok) return "annule";
  ecrire(r.details);
  return "ecrit";
}

describe("correction QCM : relecture de details obligatoire", () => {
  it("erreur de relecture → aucune écriture", async () => {
    const ecrire = vi.fn();
    expect(await enregistrer(async () => ({ data: null, error: { message: "x" } }), ecrire)).toBe("annule");
    expect(ecrire).not.toHaveBeenCalled();
  });
  it("coupure réseau (exception) → aucune écriture", async () => {
    const ecrire = vi.fn();
    expect(await enregistrer(async () => { throw new Error("Failed to fetch"); }, ecrire)).toBe("annule");
    expect(ecrire).not.toHaveBeenCalled();
  });
  it("fiche absente → aucune écriture", async () => {
    const ecrire = vi.fn();
    expect(await enregistrer(async () => ({ data: null, error: null }), ecrire)).toBe("annule");
    expect(ecrire).not.toHaveBeenCalled();
  });
  it("relecture OK → details réel transmis tel quel", async () => {
    const ecrire = vi.fn();
    const details = { reponses: { 1: ["A"] }, snapshot: { q: 1 } };
    await enregistrer(async () => ({ data: { details }, error: null }), ecrire);
    expect(ecrire).toHaveBeenCalledWith(details);
  });
  it("CorrectionQCMTab : l'annulation a lieu avant toute écriture en base", () => {
    const src = readFileSync("src/components/cours-en-ligne/CorrectionQCMTab.tsx", "utf8");
    const save = src.slice(src.indexOf("relireDetailsFiche(\n"));
    const garde = save.indexOf("if (!relectureDetails.ok)");
    expect(garde).toBeGreaterThan(0);
    expect(save.slice(garde, garde + 200)).toContain("Correction non enregistrée, réessayez");
    expect(save.slice(garde, garde + 200)).toContain("return;");
    expect(save.indexOf(".update(")).toBeGreaterThan(garde);
    expect(src.slice(0, src.indexOf("relireDetailsFiche(\n"))).not.toMatch(/apprenant_quiz_results"\)\s*\.update/);
    expect(src).not.toMatch(/currentRes\?\.details/);
  });
});
