/**
 * Apply fournisseur (formateur) overrides on top of admin's exam blanc data.
 *
 * The fournisseur portal saves question modifications in `quiz_questions_overrides`
 * with quiz_id like "bilan-examen-ta". The student-side exam blanc loader
 * (loadSavedExamens) only reads `module_editor_state` and does NOT apply
 * fournisseur overrides → student sees the original answer instead of the
 * formatrice's update.
 *
 * This module bridges the gap: applies fournisseur overrides on the matiere
 * questions of the corresponding exam blanc.
 *
 * Section ID mapping:
 *   The fournisseur portal passes `sections={BILAN_EXAMEN_*}` where each section
 *   has id = baseId + matiereIndex. The `baseId` is hardcoded per data file:
 *   - BILAN_EXAMEN_VTC:  500 + i
 *   - BILAN_EXAMEN_TAXI: 600 + i
 *   - BILAN_EXAMEN_TA:   700 + i
 *   - BILAN_EXAMEN_VA:   600 + i
 *
 *   So `matiereIndex = section_id - baseId`.
 */

import type { ExamenBlanc, Question } from "./examens-blancs-data";
import { resolveOverrideConflict } from "@/components/fournisseurs/quiz-editor-utils";

interface QuizOverrideRow {
  quiz_id: string;
  section_id: number;
  question_id: number;
  enonce: string;
  choix: { lettre: string; texte: string; correct?: boolean }[];
  updated_at?: string;
}

type AdminEditableQuestion = Question & {
  _editedAt?: string;
  manually_edited?: boolean;
};

/** Mapping quiz_id (fournisseur portal) → exam blanc id + section base id */
export const FOURNISSEUR_QUIZ_TO_EXAM: Record<string, { examId: string; baseSectionId: number }> = {
  "bilan-examen-vtc":  { examId: "bilan-vtc",  baseSectionId: 500 },
  "bilan-examen-taxi": { examId: "bilan-taxi", baseSectionId: 600 },
  "bilan-examen-ta":   { examId: "bilan-ta",   baseSectionId: 700 },
  "bilan-examen-va":   { examId: "bilan-va",   baseSectionId: 600 },
};

/**
 * Matières strictement identiques partagées entre deux bilans : une correction
 * faite sur la matière commune doit apparaître dans les deux bilans.
 * Bilan Examen TAXI matières F(T)=605 et G(T)=606 = Bilan Examen TA (index 0 et 1).
 */
const SHARED_MATIERE_TARGETS: Record<string, { examId: string; matiereIndex: number }[]> = {
  "bilan-examen-taxi::605": [{ examId: "bilan-ta", matiereIndex: 0 }],
  "bilan-examen-taxi::606": [{ examId: "bilan-ta", matiereIndex: 1 }],
};

/**
 * Apply fournisseur overrides on the matiere questions of the matching exam blancs.
 * Mutates the input examens array in place. Returns the same array for chaining.
 *
 * Rule: the most recent per-question timestamp wins, regardless of author.
 */
export function applyFournisseurOverridesToExamens(
  examens: ExamenBlanc[],
  overrides: QuizOverrideRow[],
): ExamenBlanc[] {
  if (!overrides || overrides.length === 0) return examens;

  const examById = new Map<string, ExamenBlanc>();
  examens.forEach((ex) => examById.set(ex.id, ex));

  const sortedOverrides = [...overrides].sort((a, b) => {
    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return tb - ta;
  });
  const seen = new Set<string>();
  for (const ov of sortedOverrides) {
    const dedupKey = `${ov.quiz_id}::${ov.section_id}::${ov.question_id}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const mapping = FOURNISSEUR_QUIZ_TO_EXAM[ov.quiz_id];
    if (!mapping) continue;

    const targets = [
      { examId: mapping.examId, matiereIndex: ov.section_id - mapping.baseSectionId },
      ...(SHARED_MATIERE_TARGETS[`${ov.quiz_id}::${ov.section_id}`] ?? []),
    ];

    for (const target of targets) {
      const exam = examById.get(target.examId);
      if (!exam || !Array.isArray(exam.matieres)) continue;

      const matiereIndex = target.matiereIndex;
      if (matiereIndex < 0 || matiereIndex >= exam.matieres.length) continue;

      const matiere = exam.matieres[matiereIndex];
      if (!matiere || !Array.isArray(matiere.questions)) continue;

      const qIndex = matiere.questions.findIndex((q: Question) => Number(q.id) === Number(ov.question_id));
      if (qIndex < 0) continue;

      const original = matiere.questions[qIndex] as AdminEditableQuestion;
      const adminEditedAt = original._editedAt || (original.manually_edited ? new Date(0).toISOString() : undefined);
      const winner = resolveOverrideConflict(adminEditedAt, ov.updated_at ?? "");

      if (winner === "admin") continue;

      if (ov.enonce === "__DELETED__") {
        matiere.questions = matiere.questions.filter((q: Question) => Number(q.id) !== Number(ov.question_id));
        continue;
      }

      matiere.questions[qIndex] = {
        ...original,
        enonce: ov.enonce,
        choix: ov.choix as any,
      };
    }
  }

  return examens;
}

