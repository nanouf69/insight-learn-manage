// @vitest-environment node
/**
 * Régression: une édition (ou suppression) admin sur un Bilan/exercice doit
 * TENIR après ≥ 10-15 minutes + changement d'onglet + rafraîchissement, même
 * quand :
 *   1. les copies "source" hardcodées sont ré-hydratées,
 *   2. d'anciens overrides fournisseur non marqués reviennent en arrière-plan,
 *   3. les questions sauvegardées n'ont PAS les métadonnées _editedAt /
 *      manually_edited (cas historique le plus fréquent en base).
 *
 * Ce scénario reproduit le chemin de refresh pour tous les IDs Bilan/exercices
 * (4, 9, 27, 29, 30, 81, 82, 87) et vérifie que l'édition admin est conservée.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mergeSourceExercices } from "@/components/cours-en-ligne/examens-blancs-utils";
import { applyFournisseurOverridesToExamens } from "@/components/cours-en-ligne/fournisseur-exam-overrides";
import type { ExamenBlanc } from "@/components/cours-en-ligne/examens-blancs-data";

const ALL_BILAN_MODULE_IDS = [4, 9, 27, 29, 30, 81, 82, 87];

const makeQuestion = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  enonce: `Source Q${id}`,
  choix: [
    { lettre: "A", texte: "Source A", correct: false },
    { lettre: "B", texte: "Source B", correct: true },
  ],
  ...overrides,
});

describe("Bilan/exercices : édition admin persiste après 15 min + refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it.each(ALL_BILAN_MODULE_IDS)(
    "module %i : modif enonce/choix (SANS markers) survit à un merge avec la source",
    (moduleId) => {
      const source = [
        { id: 100, titre: `Bilan ${moduleId}`, actif: true, questions: [makeQuestion(1), makeQuestion(2)] },
      ];
      // L'admin a modifié Q1 mais la ligne n'a PAS de _editedAt (cas historique).
      const savedNoMarker = [
        {
          id: 100,
          titre: `Bilan ${moduleId}`,
          actif: true,
          questions: [
            {
              id: 1,
              enonce: "ADMIN a corrigé Q1",
              choix: [
                { lettre: "A", texte: "ADMIN bonne", correct: true },
                { lettre: "B", texte: "ADMIN mauvaise", correct: false },
              ],
            },
            makeQuestion(2),
          ],
        },
      ];

      const merged = mergeSourceExercices(savedNoMarker as any, source as any);
      expect(merged[0].questions?.[0].enonce).toBe("ADMIN a corrigé Q1");
      expect(merged[0].questions?.[0].choix[0].correct).toBe(true);
      expect(merged[0].questions?.[0].choix[1].correct).toBe(false);
    },
  );

  it.each(ALL_BILAN_MODULE_IDS)(
    "module %i : question supprimée par admin NE réapparaît PAS depuis la source",
    (moduleId) => {
      const source = [
        { id: 100, titre: `Bilan ${moduleId}`, actif: true, questions: [makeQuestion(1), makeQuestion(2), makeQuestion(3)] },
      ];
      const savedAfterDelete = [
        {
          id: 100,
          titre: `Bilan ${moduleId}`,
          actif: true,
          questions: [makeQuestion(1), makeQuestion(3)],
          deletedQuestionIds: [2],
        },
      ];

      // Simulate 15 min + tab switch: un autre onglet appelle refresh().
      vi.advanceTimersByTime(15 * 60 * 1000);
      const merged = mergeSourceExercices(savedAfterDelete as any, source as any);
      const ids = merged[0].questions?.map((q) => q.id) ?? [];
      expect(ids).not.toContain(2);
      expect(ids).toEqual([1, 3]);
    },
  );

  it("Bilans examens (bilan-vtc / -taxi / -ta / -va) : override fournisseur obsolète NE gagne PAS, même sans _editedAt", () => {
    const bilanExamIds = ["bilan-vtc", "bilan-taxi", "bilan-ta", "bilan-va"];
    for (const examId of bilanExamIds) {
      const examens: ExamenBlanc[] = [
        {
          id: examId,
          titre: `Bilan Exam ${examId}`,
          matieres: [
            {
              id: "t3p",
              nom: "T3P",
              questions: [
                {
                  id: 42,
                  enonce: "ADMIN a corrigé cette question",
                  choix: [
                    { lettre: "A", texte: "ADMIN bonne", correct: true },
                    { lettre: "B", texte: "ADMIN mauvaise", correct: false },
                  ],
                } as any,
              ],
            } as any,
          ],
        } as any,
      ];

      const quizIdByExam: Record<string, string> = {
        "bilan-vtc": "bilan-examen-vtc",
        "bilan-taxi": "bilan-examen-taxi",
        "bilan-ta": "bilan-examen-ta",
        "bilan-va": "bilan-examen-va",
      };

      const baseId = { "bilan-vtc": 500, "bilan-taxi": 600, "bilan-ta": 700, "bilan-va": 600 }[examId]!;
      // Fournisseur override sans marker _editedAt qui tenterait de restaurer
      // l'ancienne réponse.
      const overrides = [
        {
          quiz_id: quizIdByExam[examId],
          section_id: baseId + 0,
          question_id: 42,
          enonce: "ANCIENNE question fournisseur",
          choix: [
            { lettre: "A", texte: "Ancienne bonne", correct: false },
            { lettre: "B", texte: "Ancienne mauvaise", correct: true },
          ],
          updated_at: new Date().toISOString(),
        },
      ];

      vi.advanceTimersByTime(15 * 60 * 1000);
      const result = applyFournisseurOverridesToExamens(examens, overrides);
      const q = result[0].matieres[0].questions[0];
      expect(q.enonce).toBe("ADMIN a corrigé cette question");
      expect(q.choix[0].correct).toBe(true);
      expect(q.choix[1].correct).toBe(false);
    }
  });
});
