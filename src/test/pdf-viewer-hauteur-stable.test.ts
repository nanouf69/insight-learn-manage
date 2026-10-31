import { describe, it, expect } from "vitest";
import { hauteurDisponibleViewer } from "@/components/cours-en-ligne/pdfViewerHauteur";

describe("Visionneuse PDF : hauteur stable sur mobile", () => {
  it("hors plein écran, la hauteur ne dépend pas de la taille de la slide (pas de boucle)", () => {
    const a = hauteurDisponibleViewer({ expanded: false, zoneMesuree: 300, hauteurEcran: 800 });
    const b = hauteurDisponibleViewer({ expanded: false, zoneMesuree: 308, hauteurEcran: 800 });
    expect(a).toBe(640);
    expect(b).toBe(640);
  });
  it("en plein écran, la zone fixe mesurée est utilisée", () => {
    expect(hauteurDisponibleViewer({ expanded: true, zoneMesuree: 700, hauteurEcran: 800 })).toBe(700);
  });
});
