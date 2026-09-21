import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const source = readFileSync("src/lib/liveChallengeSource.ts", "utf8");

describe("Challenge en direct — source des questions en lecture seule", () => {
  it("n'ecrit jamais dans les tables pedagogiques", () => {
    expect(source).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
    expect(source).not.toMatch(/save_module_editor_state|upsert_qrc_instances|qrc_engine_flags/);
  });

  it("ne lit que module_editor_state, jamais les resultats ou tentatives", () => {
    expect(source).toContain('from("module_editor_state")');
    for (const table of [
      "apprenant_quiz_results",
      "reponses_apprenants",
      "qrc_instances",
      "apprenant_module_completion",
    ]) {
      expect(source).not.toContain(table);
    }
  });

  it("produit un snapshot independant (copie des champs, pas de reference)", () => {
    expect(source).toMatch(/bonnesReponses/);
    expect(source).toMatch(/image/);
    expect(source).toMatch(/explication/);
    expect(source).toMatch(/points/);
  });

  it("reste limite au pilote d'une seule matiere VTC", () => {
    expect(source).toContain("PILOTE_MATIERE");
  });
});
