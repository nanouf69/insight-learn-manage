import { describe, it, expect } from "vitest";
import { generateEasyPassphrase } from "../../supabase/functions/_shared/credential-secrets";
import { MOTS_PHRASE_DE_PASSE } from "../../supabase/functions/_shared/passphrase-words";

describe("mot de passe temporaire facile à saisir", () => {
  it("liste de 2048 mots uniques, minuscules sans accents", () => {
    expect(MOTS_PHRASE_DE_PASSE.length).toBe(2048);
    expect(new Set(MOTS_PHRASE_DE_PASSE).size).toBe(2048);
    for (const w of MOTS_PHRASE_DE_PASSE) expect(w).toMatch(/^[a-z]{4,7}$/);
  });
  it("format 4 mots + 2 chiffres, sans majuscule", () => {
    for (let i = 0; i < 200; i++) {
      const p = generateEasyPassphrase(MOTS_PHRASE_DE_PASSE);
      expect(p).toMatch(/^([a-z]{4,7}-){4}\d{2}$/);
      expect(p).toBe(p.toLowerCase());
      expect(p.length).toBeGreaterThanOrEqual(22);
    }
  });
  it("tirages différents", () => {
    const s = new Set(Array.from({ length: 100 }, () => generateEasyPassphrase(MOTS_PHRASE_DE_PASSE)));
    expect(s.size).toBe(100);
  });
  it("refuse une liste trop courte", () => {
    expect(() => generateEasyPassphrase(["abcd"])).toThrow();
  });
});
