import { blockLearnerWrite } from "@/lib/learnerPreviewGuard";
import { supabase } from "@/integrations/supabase/client";

/**
 * Chaîne de validation des quiz / exercices.
 *
 * Règle unique et définitive :
 *   un quiz est considéré comme VALIDÉ si, et seulement si,
 *   la ligne `reponses_apprenants` (apprenant_id, exercice_id) a
 *   `status = 'submitted'` (avec `submitted_at` renseigné).
 *
 * - `reponses` seules = tentative en cours (`status = 'in_progress'`), JAMAIS une validation.
 * - Un autosave ne peut jamais repasser `submitted` → `in_progress`
 *   (trigger `trg_protect_reponses_apprenants_terminal`).
 * - Une nouvelle tentative demandée par l'admin passe par `reset_quiz_attempt`,
 *   qui archive l'ancienne tentative dans `reponses_apprenants_historique`.
 */

export type QuizAttemptStatus = "in_progress" | "submitted";

export interface QuizAttempt {
  exercice_id: string;
  exercice_type: string;
  reponses: Record<string, any> | null;
  status: QuizAttemptStatus;
  submitted_at: string | null;
  score: number | null;
  bonnes_reponses: number | null;
  total_questions: number | null;
  tentative: number;
}

/** Identifiant canonique d'un exercice de module. */
export const buildExerciceId = (moduleId: number | string, exoId: number | string) =>
  `module_${moduleId}_exo_${exoId}`;

/**
 * Identifiant d'une révision « Refaire les fausses » sur un quiz DÉJÀ validé.
 * Format volontairement hors du motif `module_X_exo_%` : jamais compté par la
 * validation automatique du module ni par les rapports `^module_X_exo_Y$`.
 */
export const buildRevisionExerciceId = (moduleId: number | string, exoId: number | string) =>
  `module_${moduleId}_revision_exo_${exoId}`;

export const exoIdDepuisRevision = (exerciceId: string): number | null => {
  const m = /^module_\d+_revision_exo_(\d+)$/.exec(exerciceId || "");
  return m ? Number(m[1]) : null;
};

/**
 * LECTURE SEULE (rapports) : rattache `module_X_exo_Y` ET `module_X_revision_exo_Y`
 * au même module X / exercice Y. Ne sert jamais à décider une validation.
 */
export const lireIdentifiantExerciceModule = (
  exerciceId: string,
): { moduleId: number; exoId: string; revision: boolean } | null => {
  const m = /^module_(\d+)_(revision_)?exo_(\d+)$/.exec(exerciceId || "");
  return m ? { moduleId: Number(m[1]), exoId: m[3], revision: !!m[2] } : null;
};

/** Trace un échec de validation de quiz de module (journal d'erreurs, invisible pour l'élève). */
export const journaliserEchecValidationQuiz = (p: {
  apprenantId: string;
  moduleId: number | string;
  exerciceId: string;
  etape: string;
}) => {
  console.error(
    `[QuizModule] Échec validation quiz — apprenant=${p.apprenantId} module=${p.moduleId} exercice=${p.exerciceId} etape=${p.etape}`,
  );
};

/** Identifiant canonique d'un quiz intégré à une page de cours. */
export const buildInlineQuizId = (moduleId: number | string, coursId: number | string) =>
  `module_${moduleId}_inline_${coursId}`;

/**
 * Identifiant canonique d'une matière d'examen blanc / bilan.
 * SEULE fonction autorisée pour construire cette clé (écriture).
 * La lecture reste compatible avec les identifiants historiques
 * (`EBx_matiere`, suffixes de tentative) via `parseExamAnswerKey`.
 */
export const buildExamMatiereExerciceId = (
  examenId: string | number | null | undefined,
  matiereId: string | number,
  tentative: number = 1
) => `${examenId || "exam"}__${matiereId}${tentative && tentative > 1 ? `__t${tentative}` : ""}`;


/** Seule condition acceptée pour dire « ce quiz est terminé ». */
export const isAttemptSubmitted = (
  attempt: Pick<QuizAttempt, "status"> | null | undefined
): boolean => attempt?.status === "submitted";

/**
 * Validation définitive côté serveur (bouton « Valider »).
 * Écrit status=submitted, submitted_at, score, bonnes réponses, total,
 * réponses, tentative, apprenant et exercice.
 */
export async function submitQuizAttempt(params: {
  apprenantId: string;
  exerciceId: string;
  exerciceType?: string;
  reponses: Record<string, any>;
  bonnesReponses?: number | null;
  totalQuestions?: number | null;
  score?: number | null;
}): Promise<QuizAttempt | null> {
  const {
    apprenantId,
    exerciceId,
    exerciceType = "quiz",
    reponses,
    bonnesReponses = null,
    totalQuestions = null,
  } = params;

  const score =
    params.score ??
    (totalQuestions && totalQuestions > 0 && bonnesReponses != null
      ? Math.round((bonnesReponses / totalQuestions) * 100)
      : null);

  if (blockLearnerWrite("submit_quiz_attempt")) return null;

  const { data, error } = await (supabase as any).rpc("submit_quiz_attempt", {
    _apprenant_id: apprenantId,
    _exercice_id: exerciceId,
    _exercice_type: exerciceType,
    _reponses: reponses ?? {},
    _score: score,
    _bonnes_reponses: bonnesReponses,
    _total_questions: totalQuestions,
  });

  if (error) {
    console.error("[quizAttempts] submit_quiz_attempt error:", error);
    return null;
  }
  return (Array.isArray(data) ? data[0] : data) as QuizAttempt | null;
}

/** Lecture des tentatives d'un apprenant pour une liste d'exercices. */
export async function fetchQuizAttempts(
  apprenantId: string,
  exerciceIds: string[]
): Promise<QuizAttempt[]> {
  if (!apprenantId || exerciceIds.length === 0) return [];
  const { data, error } = await (supabase as any)
    .from("reponses_apprenants")
    .select(
      "exercice_id, exercice_type, reponses, status, submitted_at, score, bonnes_reponses, total_questions, tentative"
    )
    .eq("apprenant_id", apprenantId)
    .in("exercice_id", exerciceIds);

  if (error) {
    console.error("[quizAttempts] fetchQuizAttempts error:", error);
    return [];
  }
  return (data ?? []) as QuizAttempt[];
}

/** Réinitialisation admin : nouvelle tentative propre (ancienne archivée). */
export async function resetQuizAttempt(
  apprenantId: string,
  exerciceId: string
): Promise<boolean> {
  if (blockLearnerWrite("reset_quiz_attempt")) return false;
  const { error } = await (supabase as any).rpc("reset_quiz_attempt", {
    _apprenant_id: apprenantId,
    _exercice_id: exerciceId,
  });
  if (error) {
    console.error("[quizAttempts] reset_quiz_attempt error:", error);
    return false;
  }
  return true;
}
