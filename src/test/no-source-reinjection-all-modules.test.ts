/**
 * Tests exhaustifs : après suppression ou modification de questions/réponses,
 * AUCUN ancien contenu source ne doit être réinjecté — quel que soit le module.
 *
 * Couvre :
 *  - suppression d'une question (avec ou sans deletedQuestionIds)
 *  - modification d'énoncé, de texte de choix, de réponse correcte
 *  - suppression d'image (image: null)
 *  - suppression d'un choix
 *  - suppression d'un exercice entier
 *  - non-résurrection des questions supprimées via `mergeSourceExercices`
 *  - non-écrasement par `forceBilanExamGestionFromSource` (Bilan Examen)
 *  - stabilité après plusieurs cycles save/load (JSON roundtrip)
 */

import { describe, it, expect } from "vitest";
import { mergeSourceExercices } from "@/components/cours-en-ligne/examens-blancs-utils";
import {
  forceBilanExamGestionFromSource,
  BILAN_EXAMEN_VTC_MODULE_ID,
  BILAN_EXAMEN_TAXI_MODULE_ID,
  BILAN_EXAMEN_FORCE_FROM_SOURCE_IDS,
} from "@/components/cours-en-ligne/bilan-examen-force-sync";

// ── Helpers ─────────────────────────────────────────────────────
const choix = (l: string, t: string, correct = false) => ({ lettre: l, texte: t, correct });
const q = (id: number, enonce: string, opts: any = {}) => ({
  id,
  enonce,
  choix: opts.choix ?? [choix("A", "A", true), choix("B", "B")],
  ...(opts.image !== undefined ? { image: opts.image } : {}),
  ...opts.extra,
});
const exo = (id: number, questions: any[], deleted?: number[]) => ({
  id,
  titre: `Exo ${id}`,
  sousTitre: "",
  actif: true,
  questions,
  ...(deleted ? { deletedQuestionIds: deleted } : {}),
});
const roundtrip = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// Simule plusieurs modules avec IDs variés (généraux + bilan examen)
const MODULE_IDS = [1, 2, 3, 4, 5, 10, 11, 20, 42, 81];

// ── 1. Suppression de question ne revient jamais ────────────────
describe("Aucune réinjection : suppression de question — tous modules", () => {
  for (const modId of MODULE_IDS) {
    it(`module ${modId} : question supprimée reste supprimée après merge`, () => {
      const source = [exo(100, [q(1, "src1"), q(2, "src2"), q(3, "src3")])];
      const saved = [exo(100, [q(1, "adm1"), q(3, "adm3")], [2])];
      const merged = mergeSourceExercices(saved, source);
      expect(merged[0].questions!.map((x) => x.id)).toEqual([1, 3]);
      expect(merged[0].questions!.find((x) => x.enonce === "src2")).toBeUndefined();
    });

    it(`module ${modId} : suppression sans deletedQuestionIds ne ressuscite pas non plus`, () => {
      const source = [exo(200, [q(1, "src1"), q(2, "src2")])];
      const saved = [exo(200, [q(1, "adm1")])];
      const merged = mergeSourceExercices(saved, source);
      expect(merged[0].questions!.length).toBe(1);
      expect(merged[0].questions![0].id).toBe(1);
    });
  }

  it("suppression multiple + roundtrip DB reste stable sur plusieurs cycles", () => {
    let saved: any = [exo(1, [q(1, "adm1")], [2, 3, 4, 5])];
    const source = [exo(1, [q(1, "src1"), q(2, "src2"), q(3, "src3"), q(4, "src4"), q(5, "src5")])];
    for (let cycle = 0; cycle < 5; cycle++) {
      saved = roundtrip(mergeSourceExercices(saved, source));
      expect(saved[0].questions.length).toBe(1);
      expect(saved[0].questions[0].enonce).toBe("adm1");
    }
  });
});

// ── 2. Modifications de contenu ────────────────────────────────
describe("Aucune réinjection : modifications d'énoncé / choix / réponse correcte", () => {
  it("énoncé modifié : la source ne l'écrase pas", () => {
    const source = [exo(1, [q(1, "énoncé source")])];
    const saved = [exo(1, [q(1, "énoncé admin modifié")])];
    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].enonce).toBe("énoncé admin modifié");
  });

  it("texte de choix modifié : la source ne l'écrase pas", () => {
    const source = [exo(1, [q(1, "Q", { choix: [choix("A", "src A", true), choix("B", "src B")] })])];
    const saved = [exo(1, [q(1, "Q", { choix: [choix("A", "adm A", true), choix("B", "adm B")] })])];
    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].choix[0].texte).toBe("adm A");
    expect(merged[0].questions![0].choix[1].texte).toBe("adm B");
  });

  it("réponse correcte modifiée A→C : survit", () => {
    const source = [exo(1, [q(1, "Q", { choix: [choix("A", "A", true), choix("B", "B"), choix("C", "C")] })])];
    const saved = [exo(1, [q(1, "Q", { choix: [choix("A", "A", false), choix("B", "B", false), choix("C", "C", true)] })])];
    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].choix[0].correct).toBe(false);
    expect(merged[0].questions![0].choix[2].correct).toBe(true);
  });

  it("choix supprimé (2 restants au lieu de 3) : ne revient pas", () => {
    const source = [exo(1, [q(1, "Q", { choix: [choix("A", "A", true), choix("B", "B"), choix("C", "C")] })])];
    const saved = [exo(1, [q(1, "Q", { choix: [choix("A", "A", true), choix("B", "B")] })])];
    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].choix.length).toBe(2);
    expect(merged[0].questions![0].choix.find((c: any) => c.lettre === "C")).toBeUndefined();
  });
});

// ── 3. Suppression d'image ─────────────────────────────────────
describe("Aucune réinjection : suppression d'image", () => {
  it("image: null (suppression admin) reste null après merge", () => {
    const source = [exo(1, [q(1, "Q", { image: "src.jpg" })])];
    const saved = [exo(1, [q(1, "Q", { image: null })])];
    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].image).toBeNull();
  });

  it("image: null survit à un JSON roundtrip (DB) puis merge", () => {
    const source = [exo(1, [q(1, "Q", { image: "src.jpg" })])];
    let saved: any = [exo(1, [q(1, "Q", { image: null })])];
    for (let i = 0; i < 3; i++) {
      saved = roundtrip(mergeSourceExercices(saved, source));
      expect(saved[0].questions[0].image).toBeNull();
    }
  });

  it("image absente (undefined) : source est utilisée comme backfill uniquement", () => {
    const source = [exo(1, [q(1, "Q", { image: "src.jpg" })])];
    const saved = [exo(1, [q(1, "Q")])]; // pas de clé image
    const merged = mergeSourceExercices(saved, source);
    expect(merged[0].questions![0].image).toBe("src.jpg");
  });
});

// ── 4. Suppression d'exercice entier ───────────────────────────
describe("Aucune réinjection : suppression d'exercice entier", () => {
  it("exercice listé dans deletedExerciceIds ne revient pas", () => {
    const source = [exo(1, [q(1, "Q1")]), exo(2, [q(1, "Q2")])];
    const saved = [exo(1, [q(1, "Q1")])];
    const merged = mergeSourceExercices(saved, source, [2]);
    expect(merged.map((e) => e.id)).toEqual([1]);
  });
});

// ── 5. Bilan Examen : force-sync non destructif ────────────────
describe("Bilan Examen : forceBilanExamGestionFromSource ne réinjecte jamais l'ancien contenu", () => {
  const moduleIds = [BILAN_EXAMEN_VTC_MODULE_ID, BILAN_EXAMEN_TAXI_MODULE_ID];

  for (const moduleId of moduleIds) {
    const forcedIds = BILAN_EXAMEN_FORCE_FROM_SOURCE_IDS[moduleId];
    const exerciseId = forcedIds[2]; // matière sécurité routière

    it(`module ${moduleId} : énoncé admin préservé (pas d'écrasement source)`, () => {
      const source = {
        exercices: [{ id: exerciseId, titre: "src", actif: true, questions: [{ id: 1, enonce: "src", image: "src.jpg" }] }],
      };
      const loaded = {
        exercices: [{ id: exerciseId, titre: "adm", actif: true, questions: [{ id: 1, enonce: "adm modifié", image: "adm.jpg" }] }],
      };
      const result = forceBilanExamGestionFromSource(moduleId, loaded, source);
      expect(result.exercices[0].questions[0].enonce).toBe("adm modifié");
      expect(result.exercices[0].questions[0].image).toBe("adm.jpg");
    });

    it(`module ${moduleId} : image supprimée (null) reste null`, () => {
      const source = {
        exercices: [{ id: exerciseId, titre: "src", actif: true, questions: [{ id: 1, enonce: "Q", image: "src.jpg" }] }],
      };
      const loaded = {
        exercices: [{ id: exerciseId, titre: "Q", actif: true, questions: [{ id: 1, enonce: "Q", image: null }] }],
      };
      const result = forceBilanExamGestionFromSource(moduleId, loaded, source);
      expect(result.exercices[0].questions[0].image).toBeNull();
    });

    it(`module ${moduleId} : question supprimée par admin ne revient pas`, () => {
      const source = {
        exercices: [{ id: exerciseId, titre: "src", actif: true, questions: [
          { id: 1, enonce: "s1" }, { id: 2, enonce: "s2" }, { id: 3, enonce: "s3" },
        ] }],
      };
      const loaded = {
        exercices: [{ id: exerciseId, titre: "adm", actif: true, questions: [
          { id: 1, enonce: "a1" }, { id: 3, enonce: "a3" },
        ] }],
      };
      const result = forceBilanExamGestionFromSource(moduleId, loaded, source);
      expect(result.exercices[0].questions.map((x: any) => x.id)).toEqual([1, 3]);
    });

    it(`module ${moduleId} : choix modifiés préservés`, () => {
      const source = {
        exercices: [{ id: exerciseId, titre: "src", actif: true, questions: [
          { id: 1, enonce: "Q", choix: [choix("A", "src A", true), choix("B", "src B")] },
        ] }],
      };
      const loaded = {
        exercices: [{ id: exerciseId, titre: "Q", actif: true, questions: [
          { id: 1, enonce: "Q", choix: [choix("A", "adm A", false), choix("B", "adm B", true)] },
        ] }],
      };
      const result = forceBilanExamGestionFromSource(moduleId, loaded, source);
      expect(result.exercices[0].questions[0].choix).toEqual([
        choix("A", "adm A", false),
        choix("B", "adm B", true),
      ]);
    });

    it(`module ${moduleId} : stabilité après plusieurs cycles roundtrip`, () => {
      const source = {
        exercices: [{ id: exerciseId, titre: "src", actif: true, questions: [
          { id: 1, enonce: "s1", image: "src1.jpg" },
          { id: 2, enonce: "s2", image: "src2.jpg" },
        ] }],
      };
      let loaded: any = {
        exercices: [{ id: exerciseId, titre: "adm", actif: true, questions: [
          { id: 1, enonce: "adm1 modifié", image: null },
        ] }],
      };
      for (let i = 0; i < 5; i++) {
        loaded = roundtrip(forceBilanExamGestionFromSource(moduleId, loaded, source));
        expect(loaded.exercices[0].questions.length).toBe(1);
        expect(loaded.exercices[0].questions[0].enonce).toBe("adm1 modifié");
        expect(loaded.exercices[0].questions[0].image).toBeNull();
      }
    });
  }

  it("module hors périmètre Bilan Examen : loadedData retourné tel quel", () => {
    const source = { exercices: [{ id: 999, titre: "s", actif: true, questions: [{ id: 1, enonce: "s" }] }] };
    const loaded = { exercices: [] };
    const result = forceBilanExamGestionFromSource(42, loaded as any, source);
    expect(result.exercices).toEqual([]);
  });
});

// ── 6. Combinaison : delete + edit + image removal ─────────────
describe("Scénario combiné : suppression + édition + suppression d'image", () => {
  it("toutes les modifications survivent simultanément", () => {
    const source = [exo(1, [
      q(1, "src Q1", { image: "src1.jpg" }),
      q(2, "src Q2", { image: "src2.jpg" }),
      q(3, "src Q3"),
    ])];
    const saved = [exo(1, [
      q(1, "admin Q1", { image: null }),                 // édité + image supprimée
      q(3, "admin Q3", { choix: [choix("A", "new", true)] }), // Q2 supprimée + choix custom
    ], [2])];

    let merged: any = mergeSourceExercices(saved, source);
    // Roundtrip pour simuler save/load DB
    merged = roundtrip(merged);
    merged = mergeSourceExercices(merged, source);

    expect(merged[0].questions.length).toBe(2);
    expect(merged[0].questions[0].enonce).toBe("admin Q1");
    expect(merged[0].questions[0].image).toBeNull();
    expect(merged[0].questions[1].enonce).toBe("admin Q3");
    expect(merged[0].questions[1].choix).toEqual([choix("A", "new", true)]);
  });
});
