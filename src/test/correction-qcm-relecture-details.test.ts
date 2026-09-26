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

describe("correction QCM : points QRC issus de la relecture unique", () => {
  const details = {
    correctionsIA: {
      "101": { pointsObtenus: 3 },
      "102": { pointsObtenus: 0 },
    },
  };

  it("les points QRC viennent du details relu, question par question", () => {
    expect(pointsQRCDepuisDetails(details, 101)).toBe(3);
    expect(pointsQRCDepuisDetails(details, 102)).toBe(0);
    expect(pointsQRCDepuisDetails(details, 999)).toBe(0); // absente → 0
  });

  it("relecture en échec → annulation avant tout calcul de note", async () => {
    const calculer = vi.fn();
    const r = await relireDetailsFiche(async () => ({ data: null, error: { message: "x" } }));
    if (r.ok) calculer(pointsQRCDepuisDetails(r.details, 101));
    expect(r.ok).toBe(false);
    expect(calculer).not.toHaveBeenCalled();
  });

  it("CorrectionQCMTab : une seule relecture, aucune requête par QRC dans la boucle", () => {
    const src = readFileSync("src/components/cours-en-ligne/CorrectionQCMTab.tsx", "utf8");
    // La relecture a lieu avant la boucle de calcul.
    const iRelecture = src.indexOf("relireDetailsFiche(\n");
    const iBoucle = src.indexOf("for (const q of matiere.questions)");
    expect(iRelecture).toBeGreaterThan(0);
    expect(iBoucle).toBeGreaterThan(iRelecture);
    // La boucle n'a aucun appel réseau : les points QRC passent par pointsQRCDepuisDetails.
    const boucle = src.slice(iBoucle, src.indexOf("noteSur20", iBoucle));
    expect(boucle).not.toContain("supabase");
    expect(boucle).not.toContain("await");
    expect(boucle).toContain("pointsQRCDepuisDetails(detailsFiche, q.id)");
    // detailsFiche provient de la relecture, jamais reconstruit à partir de {}.
    expect(src).toContain("safeRecord(relectureDetails.details)");
  });
});
