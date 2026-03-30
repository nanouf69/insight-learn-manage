/**
 * Tests for Bug 1 & Bug 2 fixes
 *
 * Bug 1: "Il enregistre pas les réponses"
 *   → exercice_id extraction used single underscore prefix but real separator is `__`
 *
 * Bug 2: "DIAMANKA a fini mais lui redemande français et anglais"
 *   → buildMatiereLookupKeys didn't strip letter prefix from nom
 *   → old DB rows (id:"d", nom:"D - Français") can't match new definitions (id:"francais", nom:"Français")
 */
import { describe, it, expect } from "vitest";
import {
  buildMatiereLookupKeys,
  shareLookupKey,
  extractMatiereKeyFromExerciceId,
} from "../components/cours-en-ligne/examens-blancs-utils";

// ────────────────────────────────────────────────────────────
// Bug 2: matiere rename causes isMatiereDone to return false
// ────────────────────────────────────────────────────────────

describe("Bug 2 — matiere lookup after definition rename", () => {
  it("should match old (id:'d', nom:'D - Français') with new (id:'francais', nom:'Français')", () => {
    const oldKeys = buildMatiereLookupKeys("d", "D - Français");
    const newKeys = buildMatiereLookupKeys("francais", "Français");
    expect(shareLookupKey(oldKeys, newKeys)).toBe(true);
  });

  it("should match old (id:'e', nom:'E - Anglais') with new (id:'anglais', nom:'Anglais')", () => {
    const oldKeys = buildMatiereLookupKeys("e", "E - Anglais");
    const newKeys = buildMatiereLookupKeys("anglais", "Anglais");
    expect(shareLookupKey(oldKeys, newKeys)).toBe(true);
  });

  it("should match old (id:'a', nom:'A - Réglementation') with new (id:'reglementation', nom:'Réglementation')", () => {
    const oldKeys = buildMatiereLookupKeys("a", "A - Réglementation");
    const newKeys = buildMatiereLookupKeys("reglementation", "Réglementation");
    expect(shareLookupKey(oldKeys, newKeys)).toBe(true);
  });

  it("should match old (id:'b', nom:'B - Gestion') with new (id:'gestion', nom:'Gestion')", () => {
    const oldKeys = buildMatiereLookupKeys("b", "B - Gestion");
    const newKeys = buildMatiereLookupKeys("gestion", "Gestion");
    expect(shareLookupKey(oldKeys, newKeys)).toBe(true);
  });

  it("should match old (id:'c', nom:'C - Sécurité') with new (id:'securite', nom:'Sécurité')", () => {
    const oldKeys = buildMatiereLookupKeys("c", "C - Sécurité");
    const newKeys = buildMatiereLookupKeys("securite", "Sécurité");
    expect(shareLookupKey(oldKeys, newKeys)).toBe(true);
  });

  it("should still match when both use the same definition (no rename)", () => {
    const keys1 = buildMatiereLookupKeys("francais", "D - Français");
    const keys2 = buildMatiereLookupKeys("francais", "D - Français");
    expect(shareLookupKey(keys1, keys2)).toBe(true);
  });

  it("should still match letter-based matières (no regression)", () => {
    const keys1 = buildMatiereLookupKeys("d", "D - Français");
    const keys2 = buildMatiereLookupKeys("d", "D - Français");
    expect(shareLookupKey(keys1, keys2)).toBe(true);
  });

  it("should not false-match two genuinely different matières", () => {
    const french = buildMatiereLookupKeys("francais", "Français");
    const english = buildMatiereLookupKeys("anglais", "Anglais");
    expect(shareLookupKey(french, english)).toBe(false);
  });

  it("should not false-match old 'd' (Français) with 'e' (Anglais)", () => {
    const d = buildMatiereLookupKeys("d", "D - Français");
    const e = buildMatiereLookupKeys("e", "E - Anglais");
    expect(shareLookupKey(d, e)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// Bug 1: exercice_id extraction leaves stray underscore
// ────────────────────────────────────────────────────────────

describe("Bug 1 — exercice_id matiereKey extraction", () => {
  it("should extract 'francais' from 'EB1__francais' with exam id 'EB1'", () => {
    expect(extractMatiereKeyFromExerciceId("EB1__francais", "EB1")).toBe("francais");
  });

  it("should extract 'anglais' from 'EB3__anglais' with exam id 'EB3'", () => {
    expect(extractMatiereKeyFromExerciceId("EB3__anglais", "EB3")).toBe("anglais");
  });

  it("should extract 'securite' from 'EB1__securite' with exam id 'EB1'", () => {
    expect(extractMatiereKeyFromExerciceId("EB1__securite", "EB1")).toBe("securite");
  });

  it("should return empty string for non-matching exercice_id", () => {
    expect(extractMatiereKeyFromExerciceId("OTHER_francais", "EB1")).toBe("");
  });

  it("should handle exam id with special chars like 'EB3-TAXI'", () => {
    expect(extractMatiereKeyFromExerciceId("EB3-TAXI__securite", "EB3-TAXI")).toBe("securite");
  });

  it("extracted key should produce matching lookup keys with live definition", () => {
    const matiereKey = extractMatiereKeyFromExerciceId("EB1__d", "EB1");
    const responseKeys = buildMatiereLookupKeys(matiereKey, matiereKey);
    const liveKeys = buildMatiereLookupKeys("d", "D - Français");
    expect(shareLookupKey(responseKeys, liveKeys)).toBe(true);
  });

  it("extracted key should match even after matiere rename", () => {
    const matiereKey = extractMatiereKeyFromExerciceId("EB1__francais", "EB1");
    const responseKeys = buildMatiereLookupKeys(matiereKey, matiereKey);
    const liveKeys = buildMatiereLookupKeys("francais", "Français");
    expect(shareLookupKey(responseKeys, liveKeys)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// buildMatiereLookupKeys — nom prefix stripping
// ────────────────────────────────────────────────────────────

describe("buildMatiereLookupKeys — stripped nom key", () => {
  it("should include a nom key without the letter prefix for 'D - Français'", () => {
    const keys = buildMatiereLookupKeys("d", "D - Français");
    expect(keys).toContain("nom:francais");
  });

  it("should include a nom key without the letter prefix for 'E - Anglais'", () => {
    const keys = buildMatiereLookupKeys("e", "E - Anglais");
    expect(keys).toContain("nom:anglais");
  });

  it("should include a nom key without prefix for 'A - Réglementation'", () => {
    const keys = buildMatiereLookupKeys("a", "A - Réglementation");
    expect(keys).toContain("nom:reglementation");
  });

  it("should not duplicate if nom has no letter prefix ('Français')", () => {
    const keys = buildMatiereLookupKeys("francais", "Français");
    const nomFrancaisCount = keys.filter(k => k === "nom:francais").length;
    expect(nomFrancaisCount).toBe(1);
  });

  it("should still include the full nom key alongside the stripped one", () => {
    const keys = buildMatiereLookupKeys("d", "D - Français");
    expect(keys).toContain("nom:d francais");
    expect(keys).toContain("nom:francais");
  });
});
