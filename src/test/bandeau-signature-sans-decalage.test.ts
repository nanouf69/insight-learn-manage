import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const src = readFileSync("src/pages/CoursPublic.tsx", "utf8");
describe("bandeau de signature à l'ouverture d'un module", () => {
  it("est superposé en bas et ne pousse jamais le contenu du module", () => {
    for (const id of ["bandeau-signature-en-attente", "bandeau-signature-erreur"]) {
      const line = src.split("\n").find((l) => l.includes(`data-testid="${id}"`))!;
      expect(line).toContain("fixed inset-x-0 bottom-0");
    }
  });
});
