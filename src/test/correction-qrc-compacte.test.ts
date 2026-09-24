// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { celluleCompacte, largeurMinimaleMatrice } from "@/features/correction-qrc-v2/celluleCompacte";

describe("Correction QRC — affichage compact (présentation uniquement)", () => {
  it("vert = humaine", () => expect(celluleCompacte({ corrigee: true, origine: "humaine", note: 1.5, points: 2, vide: false })).toMatchObject({ couleur: "vert", libelle: "✓ 1,5/2" }));
  it("orange = automatique historique", () => expect(celluleCompacte({ corrigee: true, origine: "automatique", note: 1.5, points: 2, vide: false })).toMatchObject({ couleur: "orange", libelle: "≈ 1,5/2" }));
  it("gris = origine à vérifier", () => expect(celluleCompacte({ corrigee: true, origine: "inconnue", note: 0, points: 2, vide: false }).couleur).toBe("gris"));
  it("rouge = à corriger, copie vide signalée", () => {
    expect(celluleCompacte({ corrigee: false, origine: "", note: null, points: 2, vide: true })).toMatchObject({ couleur: "rouge", libelle: "À corr. ∅/2", detail: "À corriger (/2) — copie vide" });
  });
  it("barème absent", () => expect(celluleCompacte({ corrigee: false, origine: "", note: null, points: null, vide: false }).couleur).toBe("bareme"));
  it.each([1, 2, 5, 10])("%i QRC tiennent sur un écran d'ordinateur (≤ 1280 px à 16 px/rem)", (n) => {
    expect(largeurMinimaleMatrice(n) * 16).toBeLessThanOrEqual(n === 10 ? 1100 : 800);
  });
  it("panneau fermé sans sélection, bouton fermer, en-têtes Q1…", () => {
    const src = readFileSync("src/pages/AdminCorrectionQrcV2Reel.tsx", "utf8");
    expect(src).toContain("const panneauOuvert = !ancienCircuit && !!qrcSel");
    expect(src).toContain("{panneauOuvert && <aside");
    expect(src).toContain('data-testid="fermer-panneau"');
    expect(src).toContain("Q{i + 1}");
    expect(src).toContain("zoom: `${zoom}%`");
    expect(src).toContain("requestFullscreen");
  });
});
