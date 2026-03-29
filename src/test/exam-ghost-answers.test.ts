/**
 * TDD — BUG #10: Retour en arrière ajoute des réponses fantômes aux questions
 *
 * Teste le VRAI code: applyQCMChange, computeIsMultiple, normalizeReponses
 * exportés depuis examens-blancs-utils.ts
 */
import { describe, it, expect } from "vitest";
import {
  applyQCMChange,
  computeIsMultiple,
  normalizeReponses,
} from "@/components/cours-en-ligne/examens-blancs-utils";

describe("BUG #10 — Réponses fantômes (vrai code)", () => {
  describe("applyQCMChange + computeIsMultiple", () => {
    it("une QCM à réponse unique REMPLACE au lieu d'accumuler", () => {
      const choix = [
        { lettre: "A", texte: "50 km/h", correct: true },
        { lettre: "B", texte: "30 km/h", correct: false },
        { lettre: "C", texte: "70 km/h", correct: false },
      ];

      // computeIsMultiple retourne false pour une question à 1 réponse correcte
      const question = { id: 1, enonce: "Vitesse max ?", type: "QCM" as const, choix } as any;
      expect(computeIsMultiple(question)).toBe(false);

      // Avec isMultiple=false, la réponse est REMPLACÉE
      let reponses = applyQCMChange({}, 1, "A", true, false);
      expect(reponses[1]).toEqual(["A"]);

      reponses = applyQCMChange(reponses, 1, "B", true, false);
      expect(reponses[1]).toEqual(["B"]); // remplacé, pas ["A", "B"]
    });

    it("une QCM à réponses multiples ACCUMULE correctement", () => {
      const choix = [
        { lettre: "A", texte: "Option A", correct: true },
        { lettre: "B", texte: "Option B", correct: true },
        { lettre: "C", texte: "Option C", correct: false },
      ];

      const question = { id: 1, enonce: "Choisis", type: "QCM" as const, choix } as any;
      expect(computeIsMultiple(question)).toBe(true);

      let reponses = applyQCMChange({}, 1, "A", true, true);
      reponses = applyQCMChange(reponses, 1, "B", true, true);
      expect(reponses[1]).toEqual(["A", "B"]);
    });

    it("déduplication: un double-clic ne crée pas de doublon", () => {
      let reponses = applyQCMChange({}, 1, "A", true, true);
      const reponses2 = applyQCMChange(reponses, 1, "A", true, true);

      // La deuxième fois retourne la même référence (pas de changement)
      expect(reponses2).toBe(reponses);
      expect(reponses2[1]).toEqual(["A"]); // pas ["A", "A"]
    });

    it("uncheck supprime correctement la lettre", () => {
      let reponses = applyQCMChange({}, 1, "A", true, true);
      reponses = applyQCMChange(reponses, 1, "B", true, true);
      expect(reponses[1]).toEqual(["A", "B"]);

      reponses = applyQCMChange(reponses, 1, "A", false, true);
      expect(reponses[1]).toEqual(["B"]);
    });
  });

  describe("normalizeReponses — vrai code", () => {
    it("préserve les clés numériques en les convertissant", () => {
      const raw = { "1": ["A"], "2": ["B", "C"] };
      const normalized = normalizeReponses(raw);
      expect(normalized[1]).toEqual(["A"]);
      expect(normalized[2]).toEqual(["B", "C"]);
    });

    it("préserve les clés string non-numériques", () => {
      const raw = {
        "1": ["A"],
        "securite_q3": ["B"],
        "2": ["C"],
      };
      const normalized = normalizeReponses(raw);
      expect(Object.keys(normalized).length).toBe(3);
      expect(normalized[1]).toEqual(["A"]);
      expect((normalized as any)["securite_q3"]).toEqual(["B"]);
    });

    it("filtre les valeurs null et undefined", () => {
      const raw = { "1": ["A"], "2": null, "3": undefined, "4": ["D"] };
      const normalized = normalizeReponses(raw);
      expect(Object.keys(normalized).length).toBe(2);
      expect(normalized[1]).toEqual(["A"]);
      expect(normalized[4]).toEqual(["D"]);
    });

    it("retourne un objet vide pour un input invalide", () => {
      expect(normalizeReponses(null)).toEqual({});
      expect(normalizeReponses(undefined)).toEqual({});
      expect(normalizeReponses("string")).toEqual({});
    });
  });
});
