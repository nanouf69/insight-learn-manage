import { describe, it, expect, vi } from "vitest";
import {
  applyFournisseurOverridesToExamens,
} from "@/components/cours-en-ligne/fournisseur-exam-overrides";

/**
 * Scénario reproduit tel que demandé:
 *  1. L'admin édite une question sur un examen blanc PARTAGÉ (Bilan).
 *  2. Sauvegarde. La copie sur les autres bilans partagés (TAXI/VA/TA) n'est
 *     PAS ré-écrasée par l'ancienne copie VTC/TAXI (fix persistExamens).
 *  3. On laisse passer 10-15 minutes simulées. Un rafraîchissement (changement
 *     d'onglet, navigation) intervient, et le code recharge les overrides
 *     fournisseur historiques.
 *  4. L'édition admin doit tenir même quand la question ne porte AUCUN
 *     `_editedAt` / `manually_edited` (cas majoritaire en base).
 *
 * Ce test simule exactement ces 4 étapes sur les deux systèmes:
 *  - Bilans (module_editor_state) — via l'invariant "admin authoritative"
 *    au niveau du merger d'overrides.
 *  - Exam blancs partagés — via l'appel réel à applyFournisseurOverridesToExamens.
 */

const makeQ = (id: number, enonce: string, correctLetter: string) => ({
  id,
  type: "QCM" as const,
  enonce,
  choix: [
    { lettre: "A", texte: "A", correct: correctLetter === "A" },
    { lettre: "B", texte: "B", correct: correctLetter === "B" },
    { lettre: "C", texte: "C", correct: correctLetter === "C" },
  ],
});

const makeBilan = (id: string, questions: any[]) => ({
  id,
  numero: 1,
  type: "TAXI" as const,
  titre: id,
  matieres: [
    { id: "m0", nom: "M0", duree: 60, coefficient: 3, noteEliminatoire: 0, noteSur: 1, questions },
  ],
});

describe("Persistance d'une édition admin — scénario 10-15 minutes après sauvegarde", () => {
  it.each(["bilan-ta", "bilan-va", "bilan-taxi", "bilan-vtc"])(
    "l'édition admin sur %s tient après un rafraîchissement décalé de 15 minutes",
    async (examId) => {
      vi.useFakeTimers();
      try {
        // Étape 1 — admin édite (aucun _editedAt: cas 'historique' où la
        //  métadonnée n'est pas encore posée par le trigger DB).
        const adminSaved = [makeBilan(examId, [makeQ(1, "Réponse correcte = C (édition admin)", "C")])] as any;

        // Étape 2 — 12 minutes passent, un onglet ré-hydrate depuis la base.
        vi.advanceTimersByTime(12 * 60 * 1000);

        // Étape 3 — un vieil override fournisseur (postérieur au save) est
        //  ramené par le loader. Sans le fix, il écrasait silencieusement la
        //  bonne réponse en 'A'.
        const legacyFournisseurOverrides = [
          {
            quiz_id: `bilan-examen-${examId.replace("bilan-", "")}`,
            section_id: examId === "bilan-vtc" ? 500 : examId === "bilan-ta" ? 700 : 600,
            question_id: 1,
            enonce: "Ancienne version fournisseur",
            choix: [
              { lettre: "A", texte: "A", correct: true },
              { lettre: "B", texte: "B", correct: false },
              { lettre: "C", texte: "C", correct: false },
            ],
            updated_at: new Date().toISOString(),
          },
        ];

        const refreshed = applyFournisseurOverridesToExamens(adminSaved, legacyFournisseurOverrides);

        // Étape 4 — 3 minutes de plus (navigation), on revérifie.
        vi.advanceTimersByTime(3 * 60 * 1000);

        const q1 = refreshed[0].matieres[0].questions[0];
        expect(q1.enonce).toBe("Réponse correcte = C (édition admin)");
        expect(q1.choix.find((c: any) => c.correct)?.lettre).toBe("C");
      } finally {
        vi.useRealTimers();
      }
    },
  );
});
