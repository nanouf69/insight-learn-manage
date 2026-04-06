import { describe, it, expect } from "vitest";
import { applyDbOverridesByKey } from "@/components/cours-en-ligne/shared-exercise-overrides";

/**
 * Tests pour la propagation fournisseur → élève et les risques de mauvaise modification/suppression.
 *
 * FAILLE 1: Le handler realtime `handleTrainerOverrideChange` utilise un mapping hardcodé
 *   de module_id → quiz_ids. Les modules pas dans ce mapping ne reçoivent pas
 *   les mises à jour en temps réel (il faut recharger la page).
 *
 * FAILLE 2: Pas de confirmation avant suppression de question côté fournisseur.
 *   Un clic accidentel supprime immédiatement.
 *
 * FAILLE 3: Le mapping `section_id-question_id` doit correspondre exactement
 *   à `exo.id-q.id` côté élève, sinon la modification ne s'applique pas.
 *
 * FAILLE 4: Conflit multi-fournisseurs — si 2 fournisseurs modifient la même question,
 *   le dernier (updated_at DESC) gagne silencieusement.
 *
 * FAILLE 5: Pas de garde contre fournisseurId vide (FournisseurPortal passe "").
 */

interface QuizQuestion {
  id: number;
  enonce: string;
  choix: { lettre: string; texte: string; correct?: boolean }[];
}

function makeQ(id: number, enonce: string, correct: string = "A"): QuizQuestion {
  return {
    id,
    enonce,
    choix: [
      { lettre: "A", texte: "Choix A", correct: correct === "A" },
      { lettre: "B", texte: "Choix B", correct: correct === "B" },
      { lettre: "C", texte: "Choix C", correct: correct === "C" },
    ],
  };
}

// ─── Propagation correcte: override s'applique côté élève ────────
describe("Propagation fournisseur → élève: application des overrides", () => {
  it("une modification d'énoncé par le fournisseur doit s'appliquer chez l'élève", () => {
    const questions = [makeQ(1, "Question originale"), makeQ(2, "Q2 originale")];
    const overrideMap = new Map<string, { enonce: string; choix: QuizQuestion["choix"] }>();
    overrideMap.set("70-1", {
      enonce: "Question MODIFIÉE par fournisseur",
      choix: [
        { lettre: "A", texte: "Nouveau A", correct: false },
        { lettre: "B", texte: "Nouveau B", correct: true },
      ],
    });

    const result = applyDbOverridesByKey(questions, overrideMap, 70);

    expect(result[0].enonce).toBe("Question MODIFIÉE par fournisseur");
    expect(result[0].choix[1].correct).toBe(true);
    // Q2 inchangée
    expect(result[1].enonce).toBe("Q2 originale");
  });

  it("un changement de bonne réponse par le fournisseur doit s'appliquer", () => {
    const questions = [makeQ(1, "Q1", "A")];
    const overrideMap = new Map<string, { enonce: string; choix: QuizQuestion["choix"] }>();
    overrideMap.set("70-1", {
      enonce: "Q1",
      choix: [
        { lettre: "A", texte: "Choix A", correct: false },
        { lettre: "B", texte: "Choix B", correct: true }, // B est maintenant correct
        { lettre: "C", texte: "Choix C", correct: false },
      ],
    });

    const result = applyDbOverridesByKey(questions, overrideMap, 70);
    expect(result[0].choix.find(c => c.correct)?.lettre).toBe("B");
  });

  it("une suppression __DELETED__ doit faire disparaître la question chez l'élève", () => {
    const questions = [makeQ(1, "Q1"), makeQ(2, "Q2"), makeQ(3, "Q3")];
    const overrideMap = new Map<string, { enonce: string; choix: QuizQuestion["choix"] }>();
    overrideMap.set("70-2", { enonce: "__DELETED__", choix: [] });

    const result = applyDbOverridesByKey(questions, overrideMap, 70);

    expect(result).toHaveLength(2);
    expect(result.map(q => q.id)).toEqual([1, 3]);
  });

  it("une question supprimée puis restaurée doit réapparaître", () => {
    const questions = [makeQ(1, "Q1"), makeQ(2, "Q2")];

    // Étape 1: suppression
    const overrides1 = new Map<string, { enonce: string; choix: QuizQuestion["choix"] }>();
    overrides1.set("70-2", { enonce: "__DELETED__", choix: [] });
    const after1 = applyDbOverridesByKey(questions, overrides1, 70);
    expect(after1).toHaveLength(1);

    // Étape 2: restauration (override supprimée → map vide pour cette clé)
    const overrides2 = new Map<string, { enonce: string; choix: QuizQuestion["choix"] }>();
    const after2 = applyDbOverridesByKey(questions, overrides2, 70);
    expect(after2).toHaveLength(2);
    expect(after2[1].enonce).toBe("Q2");
  });
});

// ─── Faille 3: Mauvais mapping section_id → exo.id ──────────────
describe("Faille: mapping section_id/question_id doit être exact", () => {
  it("override avec mauvais sectionId ne s'applique PAS (pas de dommage collatéral)", () => {
    const questions = [makeQ(1, "Q1 originale")];
    const overrideMap = new Map<string, { enonce: string; choix: QuizQuestion["choix"] }>();
    // Override pour section 99 au lieu de 70
    overrideMap.set("99-1", {
      enonce: "Mauvaise section",
      choix: [{ lettre: "A", texte: "A", correct: true }],
    });

    const result = applyDbOverridesByKey(questions, overrideMap, 70);
    // Question inchangée — pas de modification incorrecte
    expect(result[0].enonce).toBe("Q1 originale");
  });

  it("override avec mauvais questionId ne s'applique PAS", () => {
    const questions = [makeQ(1, "Q1 originale")];
    const overrideMap = new Map<string, { enonce: string; choix: QuizQuestion["choix"] }>();
    // Override pour question 999 qui n'existe pas
    overrideMap.set("70-999", {
      enonce: "Question fantôme",
      choix: [{ lettre: "A", texte: "A", correct: true }],
    });

    const result = applyDbOverridesByKey(questions, overrideMap, 70);
    expect(result).toHaveLength(1);
    expect(result[0].enonce).toBe("Q1 originale");
  });
});

// ─── Faille 4: Conflit multi-fournisseurs ────────────────────────
describe("Faille: conflit multi-fournisseurs (dernier gagne)", () => {
  it("si 2 fournisseurs modifient la même question, le dernier updated_at gagne", () => {
    // Simulation: la query retourne les overrides triées par updated_at DESC
    // Le code ne garde que la première (la plus récente) pour chaque clé
    const dbRows = [
      { section_id: 70, question_id: 1, enonce: "Version fournisseur B (plus récent)", choix: [], updated_at: "2026-04-06T15:00:00" },
      { section_id: 70, question_id: 1, enonce: "Version fournisseur A (ancien)", choix: [], updated_at: "2026-04-06T14:00:00" },
    ];

    // Reproduire la logique du handler (garder la première occurrence = plus récente)
    const overrideMap = new Map<string, { enonce: string; choix: any[] }>();
    for (const ov of dbRows) {
      const key = `${ov.section_id}-${ov.question_id}`;
      if (!overrideMap.has(key)) {
        overrideMap.set(key, { enonce: ov.enonce, choix: ov.choix });
      }
    }

    const questions = [makeQ(1, "Q1 source")];
    const result = applyDbOverridesByKey(questions, overrideMap, 70);

    // Fournisseur B (plus récent) gagne — c'est le comportement actuel
    expect(result[0].enonce).toBe("Version fournisseur B (plus récent)");
  });
});

// ─── Faille 1: Realtime handler hardcodé ─────────────────────────
describe("Faille: realtime handler utilise un mapping hardcodé", () => {
  it("documenter les modules manquants dans le mapping hardcodé", () => {
    // Mapping hardcodé actuel dans handleTrainerOverrideChange
    const trainerQuizIdsByModuleId: Record<number, string[]> = {
      12: ["cas-pratique-taxi"],
      7: ["connaissance-ville"],
      64: ["equipements-taxi"],
      13: ["controle-connaissances-taxi"],
      40: ["reglementation-nationale", "reglementation-locale"],
      10: ["reglementation-nationale", "reglementation-locale"],
      27: ["bilan-exercices-ta"],
      28: ["bilan-examen-ta"],
      9: ["bilan-exercices-taxi"],
      11: ["bilan-examen-taxi"],
    };

    // Quiz IDs utilisés par les fournisseurs (de FournisseurPortal.tsx)
    const fournisseurQuizIds = [
      "reglementation-nationale",
      "reglementation-locale",
      "connaissance-ville",
      "equipements-taxi",
      "cas-pratique-taxi",
      "controle-connaissances-taxi",
      "bilan-exercices-ta",
      "bilan-examen-ta",
    ];

    // Vérifier que chaque quiz fournisseur est couvert dans au moins un module
    for (const quizId of fournisseurQuizIds) {
      const coveredByModule = Object.values(trainerQuizIdsByModuleId).some(ids => ids.includes(quizId));
      expect(coveredByModule).toBe(true);
    }
  });

  it("le handler initial (loadTrainerOverrides) utilise aussi la découverte dynamique", () => {
    // loadTrainerOverrides fait: SELECT quiz_id FROM quiz_questions_overrides LIMIT 100
    // puis merge avec le hardcodé. Donc les nouveaux quiz_ids sont couverts au chargement.
    // MAIS handleTrainerOverrideChange ne fait PAS ça → les changements en temps réel
    // pour les modules non-hardcodés sont ignorés.
    // Ce test documente cette limitation.
    const hardcodedModuleIds = [12, 7, 64, 13, 40, 10, 27, 28, 9, 11];
    // Un module qui n'est PAS dans le hardcodé
    const unknownModuleId = 99;
    expect(hardcodedModuleIds.includes(unknownModuleId)).toBe(false);
    // → handleTrainerOverrideChange retourne sans traiter pour module 99
  });
});

// ─── Suppression de toutes les questions d'un exercice ───────────
describe("Risque: suppression de toutes les questions d'un exercice", () => {
  it("si toutes les questions sont supprimées, l'exercice entier doit disparaître", () => {
    const questions = [makeQ(1, "Q1"), makeQ(2, "Q2")];
    const overrideMap = new Map<string, { enonce: string; choix: any[] }>();
    overrideMap.set("70-1", { enonce: "__DELETED__", choix: [] });
    overrideMap.set("70-2", { enonce: "__DELETED__", choix: [] });

    const result = applyDbOverridesByKey(questions, overrideMap, 70);
    expect(result).toHaveLength(0);
    // Le code ModuleDetailView (ligne 2241) gère ce cas:
    // if (exo.questions.length > 0 && updatedQuestions.length === 0) return null;
    // → l'exercice est retiré de la liste
  });
});

// ─── Override avec choix invalides ───────────────────────────────
describe("Risque: override avec données invalides dans la DB", () => {
  it("override avec choix vides ne crash pas l'application", () => {
    const questions = [makeQ(1, "Q1")];
    const overrideMap = new Map<string, { enonce: string; choix: any[] }>();
    overrideMap.set("70-1", {
      enonce: "Question modifiée",
      choix: [], // aucun choix — ne devrait pas arriver mais faut pas crash
    });

    const result = applyDbOverridesByKey(questions, overrideMap, 70);
    expect(result[0].enonce).toBe("Question modifiée");
    expect(result[0].choix).toHaveLength(0);
  });

  it("override avec 0 bonne réponse s'applique quand même (donnée invalide)", () => {
    const questions = [makeQ(1, "Q1", "A")];
    const overrideMap = new Map<string, { enonce: string; choix: any[] }>();
    overrideMap.set("70-1", {
      enonce: "Q1",
      choix: [
        { lettre: "A", texte: "A", correct: false },
        { lettre: "B", texte: "B", correct: false },
      ],
    });

    const result = applyDbOverridesByKey(questions, overrideMap, 70);
    // Aucune bonne réponse — donnée invalide, pas de garde côté élève
    const hasCorrect = result[0].choix.some((c: any) => c.correct);
    expect(hasCorrect).toBe(false);
    // Ceci est un risque: si la validation côté fournisseur ne marche pas,
    // l'élève voit une question sans bonne réponse
  });
});
