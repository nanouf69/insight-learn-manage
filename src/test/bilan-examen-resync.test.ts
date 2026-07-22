// @vitest-environment node
import { describe, it, expect } from "vitest";

import { BILAN_EXAMEN_VTC } from "@/components/cours-en-ligne/bilan-examen-vtc-data";
import { BILAN_EXAMEN_TAXI } from "@/components/cours-en-ligne/bilan-examen-taxi-data";
import { BILAN_EXAMEN_TA } from "@/components/cours-en-ligne/bilan-examen-ta-data";
import { BILAN_EXAMEN_VA } from "@/components/cours-en-ligne/bilan-examen-va-data";
import {
  BILAN_EXAMEN_FORCE_FROM_SOURCE_IDS,
  BILAN_EXAMEN_TAXI_MODULE_ID,
  BILAN_EXAMEN_VTC_MODULE_ID,
  forceBilanExamGestionFromSource,
} from "@/components/cours-en-ligne/bilan-examen-force-sync";

const cloneExercise = (exercise: any) => JSON.parse(JSON.stringify(exercise));

const collectImageMap = (exercises: any[]) => {
  const map = new Map<string, string>();
  for (const ex of exercises) {
    for (const q of ex.questions ?? []) {
      if (q.image) map.set(`${ex.id}#${q.id}`, q.image);
    }
  }
  return map;
};

describe("Bilan Examen — resynchronisation matières (questions & images)", () => {
  describe.each([
    ["VTC", BILAN_EXAMEN_VTC, 500],
    ["TAXI", BILAN_EXAMEN_TAXI, 600],
    ["TA", BILAN_EXAMEN_TA, undefined],
    ["VA", BILAN_EXAMEN_VA, undefined],
  ])("Source de vérité — %s", (_label, source: any[], expectedBaseId) => {
    it("expose au moins une matière avec des questions", () => {
      expect(Array.isArray(source)).toBe(true);
      expect(source.length).toBeGreaterThan(0);
      for (const ex of source) {
        expect(Array.isArray(ex.questions)).toBe(true);
        expect(ex.questions.length).toBeGreaterThan(0);
      }
    });

    it("attribue des IDs de questions uniques par matière", () => {
      for (const ex of source) {
        const ids = ex.questions.map((q: any) => q.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });

    it("propage le champ image quand la question source en contient une", () => {
      for (const ex of source) {
        for (const q of ex.questions) {
          // Le mapping matiereToExercice doit préserver toutes les propriétés
          // de la question (via ...q), y compris image / imageSize / type.
          expect(q).toHaveProperty("enonce");
          if ("image" in q && q.image) {
            expect(typeof q.image).toBe("string");
            expect(q.image.length).toBeGreaterThan(0);
          }
        }
      }
    });

    if (expectedBaseId !== undefined) {
      it(`assigne les IDs d'exercices à partir de ${expectedBaseId}`, () => {
        source.forEach((ex, i) => {
          expect(Number(ex.id)).toBe(expectedBaseId + i);
        });
      });
    }
  });

  describe("forceBilanExamGestionFromSource", () => {
    const sourceVtc = { exercices: BILAN_EXAMEN_VTC } as any;
    const sourceTaxi = { exercices: BILAN_EXAMEN_TAXI } as any;

    it("écrase les énoncés du snapshot par ceux de la source (VTC)", () => {
      const corrupted = {
        exercices: BILAN_EXAMEN_VTC.map((ex) => ({
          ...cloneExercise(ex),
          questions: ex.questions.map((q: any) => ({
            ...q,
            enonce: "SNAPSHOT CORROMPU",
          })),
        })),
      } as any;

      const resolved = forceBilanExamGestionFromSource(
        BILAN_EXAMEN_VTC_MODULE_ID,
        corrupted,
        sourceVtc,
      );

      for (const ex of resolved.exercices) {
        for (const q of ex.questions as any[]) {
          expect(q.enonce).not.toBe("SNAPSHOT CORROMPU");
        }
      }
    });

    it("restaure la bonne image pour chaque question (VTC)", () => {
      const sourceImages = collectImageMap(BILAN_EXAMEN_VTC as any[]);

      // Snapshot mélangé : décale les images d'une question sur l'autre.
      const shuffled = {
        exercices: BILAN_EXAMEN_VTC.map((ex) => {
          const cloned = cloneExercise(ex);
          cloned.questions = cloned.questions.map((q: any, i: number, arr: any[]) => ({
            ...q,
            image: arr[(i + 1) % arr.length]?.image ?? q.image,
          }));
          return cloned;
        }),
      } as any;

      const resolved = forceBilanExamGestionFromSource(
        BILAN_EXAMEN_VTC_MODULE_ID,
        shuffled,
        sourceVtc,
      );

      const resolvedImages = collectImageMap(resolved.exercices);
      for (const [key, image] of sourceImages.entries()) {
        expect(resolvedImages.get(key)).toBe(image);
      }
    });

    it("réinjecte une matière supprimée du snapshot (TAXI)", () => {
      const missing = {
        exercices: BILAN_EXAMEN_TAXI.filter((ex) => Number(ex.id) !== 601).map(cloneExercise),
      } as any;

      const resolved = forceBilanExamGestionFromSource(
        BILAN_EXAMEN_TAXI_MODULE_ID,
        missing,
        sourceTaxi,
      );

      const found = resolved.exercices.find((ex) => Number(ex.id) === 601);
      expect(found).toBeDefined();
      expect(found!.questions.length).toBeGreaterThan(0);
    });

    it("ne modifie pas les exercices hors périmètre Bilan Examen", () => {
      const otherExercise = {
        id: 999,
        titre: "Exercice hors bilan",
        questions: [{ id: 1, enonce: "Conservé", image: "custom.png" }],
      };

      const loaded = {
        exercices: [
          otherExercise,
          ...BILAN_EXAMEN_VTC.map((ex) => ({
            ...cloneExercise(ex),
            questions: ex.questions.map((q: any) => ({ ...q, enonce: "X" })),
          })),
        ],
      } as any;

      const resolved = forceBilanExamGestionFromSource(
        BILAN_EXAMEN_VTC_MODULE_ID,
        loaded,
        sourceVtc,
      );

      const preserved = resolved.exercices.find((ex) => Number(ex.id) === 999);
      expect(preserved).toEqual(otherExercise);
    });

    it("ne modifie rien pour un module non couvert par la resynchronisation", () => {
      const unrelated = {
        exercices: [
          { id: 1, titre: "Libre", questions: [{ id: 1, enonce: "OK" }] },
        ],
      } as any;

      const resolved = forceBilanExamGestionFromSource(9999, unrelated, sourceVtc);
      expect(resolved).toEqual(unrelated);
    });

    it("garantit la couverture des IDs d'exercices déclarés", () => {
      for (const [moduleId, ids] of Object.entries(BILAN_EXAMEN_FORCE_FROM_SOURCE_IDS)) {
        const source =
          Number(moduleId) === BILAN_EXAMEN_VTC_MODULE_ID ? BILAN_EXAMEN_VTC : BILAN_EXAMEN_TAXI;
        for (const id of ids) {
          expect(
            source.some((ex: any) => Number(ex.id) === id),
            `Exercice ${id} introuvable dans la source du module ${moduleId}`,
          ).toBe(true);
        }
      }
    });
  });
});
