// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { etatFormation } from "@/components/cours-en-ligne/StudentHoursTracker";

describe("Formation e-learning terminée = heures + modules", () => {
  it("heures atteintes + 100 % modules → terminée", () => {
    expect(etatFormation(100, 12, 12)).toBe("terminee");
  });
  it("heures atteintes + 90 % modules → presque (jamais terminée)", () => {
    expect(etatFormation(100, 9, 10)).toBe("presque");
  });
  it("heures atteintes, modules inconnus → presque", () => {
    expect(etatFormation(100, undefined, undefined)).toBe("presque");
    expect(etatFormation(100, 0, 0)).toBe("presque");
  });
  it("heures non atteintes, même avec tous les modules → en cours", () => {
    expect(etatFormation(80, 12, 12)).toBe("en_cours");
  });
  it("bouton Terminé : aucune fausse réussite côté élève sans identité", () => {
    const src = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
    const i = src.indexOf("const persistModuleCompletion = async");
    const block = src.slice(i, i + 800);
    expect(block).toMatch(/if \(!apprenantId\) \{[\s\S]*if \(studentOnly\) \{[\s\S]*return false;/);
  });
});
