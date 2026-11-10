import { describe, expect, it } from "vitest";
import { estIaNonValidee } from "./eb2Consultation";
import { origineCorrection } from "./noyauReel";
import { celluleCompacte } from "./celluleCompacte";

describe("note proposée par l'IA ≠ note humaine vérifiée", () => {
  it("IA non validée détectée, validation formateur prioritaire", () => {
    expect(estIaNonValidee({ correctedBy: "ia:google/gemini-3.8-flash", pointsObtenus: 2 })).toBe(true);
    expect(estIaNonValidee({ ia: true, pointsObtenus: 1 })).toBe(true);
    expect(estIaNonValidee({ correctedBy: "ia:x", validatedByAdmin: true, pointsObtenus: 2 })).toBe(false);
    expect(estIaNonValidee({ manuel: true, pointsObtenus: 2 })).toBe(false);
    expect(estIaNonValidee(null)).toBe(false);
  });
  it("copie historique IA = violet avec la note, jamais vert", () => {
    const origine = origineCorrection({ etat: "corrigee", corrige_email: "ia:copie historique" });
    expect(origine).toBe("ia");
    const c = celluleCompacte({ corrigee: true, origine, note: 2, points: 2, vide: false });
    expect(c.couleur).toBe("violet");
    expect(c.libelle).toBe("🤖 2/2");
  });
});
