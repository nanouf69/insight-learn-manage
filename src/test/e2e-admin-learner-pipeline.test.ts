/**
 * Tests E2E pipeline : simulent le parcours COMPLET
 *   admin édite → autosave → écriture DB (JSON roundtrip) → apprenant recharge
 *
 * Utilisent exactement les mêmes fonctions que la production
 * (`mergeSourceExercices` + `forceBilanExamGestionFromSource`) pour garantir
 * qu'aucun ancien contenu source ne réapparaît côté apprenant après
 * rechargement, refresh Realtime, ou changement d'onglet.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mergeSourceExercices } from "@/components/cours-en-ligne/examens-blancs-utils";
import {
  forceBilanExamGestionFromSource,
  BILAN_EXAMEN_VTC_MODULE_ID,
  BILAN_EXAMEN_TAXI_MODULE_ID,
} from "@/components/cours-en-ligne/bilan-examen-force-sync";

// ─── Simulateur DB module_editor_state ─────────────────────────
type DbRow = { module_id: number; module_data: any; updated_at: string };
class FakeModuleEditorStateDb {
  private rows = new Map<number, DbRow>();
  upsert(moduleId: number, data: any) {
    // Sérialisation JSON pour reproduire exactement le comportement Postgres
    this.rows.set(moduleId, {
      module_id: moduleId,
      module_data: JSON.parse(JSON.stringify(data)),
      updated_at: new Date().toISOString(),
    });
  }
  select(moduleId: number): any | null {
    const row = this.rows.get(moduleId);
    return row ? JSON.parse(JSON.stringify(row.module_data)) : null;
  }
}

// ─── Simulateur navigateur admin ──────────────────────────────
class AdminSession {
  constructor(private db: FakeModuleEditorStateDb, private moduleId: number) {}
  private draft: any = null;

  load(sourceData: any) {
    const saved = this.db.select(this.moduleId);
    // Comportement de la vraie app : merge sur les exercices
    const exercices = saved
      ? mergeSourceExercices(saved.exercices, sourceData.exercices)
      : sourceData.exercices;
    this.draft = { ...sourceData, ...(saved ?? {}), exercices };
    return this.draft;
  }

  editQuestion(exerciseId: number, questionId: number, patch: any) {
    const exo = this.draft.exercices.find((e: any) => e.id === exerciseId);
    const idx = exo.questions.findIndex((q: any) => q.id === questionId);
    exo.questions[idx] = { ...exo.questions[idx], ...patch };
  }
  deleteQuestion(exerciseId: number, questionId: number) {
    const exo = this.draft.exercices.find((e: any) => e.id === exerciseId);
    exo.questions = exo.questions.filter((q: any) => q.id !== questionId);
    exo.deletedQuestionIds = [...(exo.deletedQuestionIds ?? []), questionId];
  }
  deleteImage(exerciseId: number, questionId: number) {
    const exo = this.draft.exercices.find((e: any) => e.id === exerciseId);
    const q = exo.questions.find((x: any) => x.id === questionId);
    q.image = null; // suppression explicite
  }
  autosave() {
    this.db.upsert(this.moduleId, this.draft);
  }
}

// ─── Simulateur navigateur apprenant ───────────────────────────
class LearnerSession {
  constructor(private db: FakeModuleEditorStateDb, private moduleId: number) {}
  /**
   * Reproduit le pipeline de chargement de `ModuleDetailView` côté apprenant :
   *  1. Récupération de module_editor_state
   *  2. Merge avec la source via mergeSourceExercices
   *  3. Pour Bilan Examen : passage dans forceBilanExamGestionFromSource
   */
  reload(sourceData: any) {
    const saved = this.db.select(this.moduleId);
    let merged: any;
    if (saved) {
      merged = {
        ...sourceData,
        ...saved,
        exercices: mergeSourceExercices(saved.exercices, sourceData.exercices),
      };
    } else {
      merged = sourceData;
    }
    // Étape Bilan Examen : merge non-destructif image-only
    merged = forceBilanExamGestionFromSource(this.moduleId, merged, sourceData);
    return merged;
  }
}

// ─── Fixtures : données source par module ──────────────────────
const buildSource = (exoId: number) => ({
  exercices: [
    {
      id: exoId,
      titre: "Sécurité routière",
      actif: true,
      questions: [
        { id: 1, enonce: "SRC — Q1", image: "src-q1.jpg",
          choix: [{ lettre: "A", texte: "SRC A", correct: true }, { lettre: "B", texte: "SRC B", correct: false }] },
        { id: 2, enonce: "SRC — Q2", image: "src-q2.jpg",
          choix: [{ lettre: "A", texte: "SRC A", correct: true }, { lettre: "B", texte: "SRC B", correct: false }] },
        { id: 3, enonce: "SRC — Q3", image: "src-q3.jpg",
          choix: [{ lettre: "A", texte: "SRC A", correct: true }, { lettre: "B", texte: "SRC B", correct: false }] },
      ],
    },
  ],
});

// Modules à couvrir (généraux + Bilan Examen VTC/TAXI)
const CASES: { moduleId: number; exoId: number; label: string }[] = [
  { moduleId: 1, exoId: 10, label: "Module 1 (général)" },
  { moduleId: 4, exoId: 40, label: "Module 4 (général)" },
  { moduleId: BILAN_EXAMEN_VTC_MODULE_ID, exoId: 502, label: "Bilan Examen VTC (Sécurité routière)" },
  { moduleId: BILAN_EXAMEN_TAXI_MODULE_ID, exoId: 602, label: "Bilan Examen TAXI (Sécurité routière)" },
  { moduleId: 20, exoId: 200, label: "Module 20 (général)" },
  { moduleId: 42, exoId: 420, label: "Module 42 (général)" },
];

describe("E2E : admin édite + supprime → l'apprenant ne voit jamais l'ancien contenu source", () => {
  for (const { moduleId, exoId, label } of CASES) {
    describe(label, () => {
      let db: FakeModuleEditorStateDb;
      let admin: AdminSession;
      let learner: LearnerSession;
      let source: any;

      beforeEach(() => {
        db = new FakeModuleEditorStateDb();
        admin = new AdminSession(db, moduleId);
        learner = new LearnerSession(db, moduleId);
        source = buildSource(exoId);
      });

      it("modification d'énoncé : l'apprenant lit la version admin, pas la source", () => {
        admin.load(source);
        admin.editQuestion(exoId, 1, { enonce: "ADMIN — Q1 corrigée" });
        admin.autosave();

        const view = learner.reload(source);
        const q1 = view.exercices[0].questions.find((q: any) => q.id === 1);
        expect(q1.enonce).toBe("ADMIN — Q1 corrigée");
        expect(q1.enonce).not.toContain("SRC");
      });

      it("modification de réponse correcte A→B : la source ne re-force pas A", () => {
        admin.load(source);
        admin.editQuestion(exoId, 2, {
          choix: [{ lettre: "A", texte: "SRC A", correct: false }, { lettre: "B", texte: "SRC B", correct: true }],
        });
        admin.autosave();

        const view = learner.reload(source);
        const q2 = view.exercices[0].questions.find((q: any) => q.id === 2);
        expect(q2.choix[0].correct).toBe(false);
        expect(q2.choix[1].correct).toBe(true);
      });

      it("suppression de question : la question n'apparaît plus côté apprenant", () => {
        admin.load(source);
        admin.deleteQuestion(exoId, 2);
        admin.autosave();

        const view = learner.reload(source);
        const ids = view.exercices[0].questions.map((q: any) => q.id);
        expect(ids).not.toContain(2);
        expect(ids).toEqual([1, 3]);
      });

      it("suppression d'image : image reste null même après plusieurs rechargements", () => {
        admin.load(source);
        admin.deleteImage(exoId, 1);
        admin.autosave();

        // 3 reloads successifs (simulent refresh + Realtime + focus tab)
        for (let i = 0; i < 3; i++) {
          const view = learner.reload(source);
          const q1 = view.exercices[0].questions.find((q: any) => q.id === 1);
          expect(q1.image).toBeNull();
          expect(q1.image).not.toBe("src-q1.jpg");
        }
      });

      it("scénario combiné : édition + suppression + image null persistent après recharges multiples", () => {
        admin.load(source);
        admin.editQuestion(exoId, 1, { enonce: "ADMIN — Q1" });
        admin.deleteImage(exoId, 1);
        admin.deleteQuestion(exoId, 2);
        admin.editQuestion(exoId, 3, {
          choix: [{ lettre: "A", texte: "ADMIN A", correct: false }, { lettre: "B", texte: "ADMIN B", correct: true }],
        });
        admin.autosave();

        for (let i = 0; i < 5; i++) {
          const view = learner.reload(source);
          const qs = view.exercices[0].questions;
          expect(qs.map((q: any) => q.id)).toEqual([1, 3]);

          const q1 = qs.find((q: any) => q.id === 1);
          expect(q1.enonce).toBe("ADMIN — Q1");
          expect(q1.image).toBeNull();

          const q3 = qs.find((q: any) => q.id === 3);
          expect(q3.choix[0].texte).toBe("ADMIN A");
          expect(q3.choix[0].correct).toBe(false);
          expect(q3.choix[1].correct).toBe(true);

          // Aucune question ne doit contenir de texte source
          for (const q of qs) {
            expect(q.enonce).not.toContain("SRC");
          }
        }
      });

      it("admin fait plusieurs vagues d'édition (autosave répété) : la dernière version gagne toujours", () => {
        admin.load(source);
        admin.editQuestion(exoId, 1, { enonce: "v1" });
        admin.autosave();

        admin.load(source);
        admin.editQuestion(exoId, 1, { enonce: "v2" });
        admin.autosave();

        admin.load(source);
        admin.editQuestion(exoId, 1, { enonce: "v3-final" });
        admin.autosave();

        const view = learner.reload(source);
        const q1 = view.exercices[0].questions.find((q: any) => q.id === 1);
        expect(q1.enonce).toBe("v3-final");
      });

      it("apprenant qui recharge en cours d'édition admin voit toujours la dernière version sauvegardée", () => {
        admin.load(source);
        admin.editQuestion(exoId, 1, { enonce: "sauvé" });
        admin.autosave();

        // Admin continue à éditer sans autosave — le draft n'est pas en base
        admin.editQuestion(exoId, 1, { enonce: "brouillon non sauvé" });

        const view = learner.reload(source);
        const q1 = view.exercices[0].questions.find((q: any) => q.id === 1);
        expect(q1.enonce).toBe("sauvé"); // pas la source, pas le brouillon
      });
    });
  }
});

describe("E2E : régression bug historique — l'ancien contenu ne revient plus", () => {
  it("scénario réel : admin corrige 20 images de Q en null puis 5 reloads → aucune image source ne revient", () => {
    const db = new FakeModuleEditorStateDb();
    const admin = new AdminSession(db, BILAN_EXAMEN_VTC_MODULE_ID);
    const learner = new LearnerSession(db, BILAN_EXAMEN_VTC_MODULE_ID);

    // Source avec 20 questions ayant toutes une image
    const source = {
      exercices: [{
        id: 502,
        titre: "Sécurité routière",
        actif: true,
        questions: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          enonce: `Q${i + 1}`,
          image: `src-${i + 1}.jpg`,
          choix: [{ lettre: "A", texte: "A", correct: true }, { lettre: "B", texte: "B", correct: false }],
        })),
      }],
    };

    admin.load(source);
    for (let i = 1; i <= 20; i++) admin.deleteImage(502, i);
    admin.autosave();

    for (let cycle = 0; cycle < 5; cycle++) {
      const view = learner.reload(source);
      const questions = view.exercices[0].questions;
      expect(questions.length).toBe(20);
      for (const q of questions) {
        expect(q.image).toBeNull();
      }
    }
  });
});
