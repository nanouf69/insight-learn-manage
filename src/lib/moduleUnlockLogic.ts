// Pure helpers for module unlocking logic, extracted from CoursPublic.tsx
// to enable unit testing without the heavy CoursPublic dependencies.

export interface ModuleLite {
  id: number;
}

export interface QuizStatsLite {
  completedQuizzes: number;
  totalQuizzes: number;
}

export interface ExamStatsLite {
  completed: number;
  total: number;
}

export interface UnlockComputationInput {
  modules: ModuleLite[];
  completedModuleIds: Set<number>;
  moduleQuizStatsById: Record<number, QuizStatsLite | undefined>;
  examBlancStatsById: Record<number, ExamStatsLite | undefined>;
  isElearning: boolean;
  introModuleIds?: Set<number>;
  alwaysUnlockedIds?: Set<number>;
}

export interface UnlockComputationResult {
  effectivelyCompletedIds: Set<number>;
  unlockedModuleIds: Set<number>;
}

export interface CompletionLite {
  module_id: number;
  status?: string | null;
  completed_at?: string | null;
}

/**
 * Server terminal states are authoritative. A completed parent row is enough;
 * child rows are only a legacy fallback when the parent row is absent.
 */
export function computeServerCompletedModuleIds(
  completionRows: CompletionLite[],
  parentToChildren: Record<number, number[]>,
  normalizeModuleId: (moduleId: number) => number,
): Set<number> {
  const doneRawIds = new Set(
    completionRows
      .filter((row) => row.status === "completed" || (row.status == null && !!row.completed_at))
      .map((row) => Number(row.module_id)),
  );
  const result = new Set<number>();

  doneRawIds.forEach((rawId) => {
    const normalizedId = normalizeModuleId(rawId);
    if (rawId === normalizedId) {
      result.add(normalizedId);
      return;
    }

    const children = parentToChildren[normalizedId] ?? [];
    if (children.length > 0 && children.every((childId) => doneRawIds.has(childId))) {
      result.add(normalizedId);
    }
  });

  return result;
}

const DEFAULT_INTRO_MODULE_IDS = new Set([1, 26, 31, 32, 33, 34]);
const DEFAULT_ALWAYS_UNLOCKED_IDS = new Set([70, 71, 72, 73]);

/**
 * Compute the effectively completed module ids and the unlocked module ids.
 * A module is "effectively completed" if either:
 *   (a) it is recorded in apprenant_module_completion (completedModuleIds), OR
 *   (b) all its quizzes/exams are completed.
 *
 * Sequential unlocking (e-learning): module N+1 is unlocked when module N is
 * effectively completed.
 */
export function computeUnlockState(
  input: UnlockComputationInput,
): UnlockComputationResult {
  const {
    modules,
    completedModuleIds,
    moduleQuizStatsById,
    examBlancStatsById,
    isElearning,
    introModuleIds = DEFAULT_INTRO_MODULE_IDS,
    alwaysUnlockedIds = DEFAULT_ALWAYS_UNLOCKED_IDS,
  } = input;

  // Terminé = décision du serveur uniquement (jamais les compteurs du navigateur).
  const effectivelyCompletedIds = new Set<number>(completedModuleIds);
  // « Validation en cours » : toutes les activités remises, en attente du serveur.
  // Le module suivant n'est pas bloqué pendant ce délai (jamais d'élève bloqué à tort).
  const enValidationIds = new Set<number>();
  modules.forEach((m) => {
    if (isModuleAwaitingValidation(completedModuleIds.has(m.id), moduleQuizStatsById[m.id], examBlancStatsById[m.id])) {
      enValidationIds.add(m.id);
    }
  });

  const unlockedModuleIds = new Set<number>();
  if (modules.length > 0) {
    unlockedModuleIds.add(modules[0].id);
  }

  if (isElearning) {
    for (let i = 0; i < modules.length; i++) {
      if (i === 0 || alwaysUnlockedIds.has(modules[i].id)) {
        unlockedModuleIds.add(modules[i].id);
      } else if (effectivelyCompletedIds.has(modules[i - 1].id) || enValidationIds.has(modules[i - 1].id)) {
        unlockedModuleIds.add(modules[i].id);
      }
    }
  } else {
    modules.forEach((m) => unlockedModuleIds.add(m.id));
  }

  modules.forEach((m) => {
    if (effectivelyCompletedIds.has(m.id)) {
      if (!isElearning || !introModuleIds.has(m.id)) {
        unlockedModuleIds.add(m.id);
      }
    }
  });

  return { effectivelyCompletedIds, unlockedModuleIds };
}

export function isModuleLocked(
  modId: number,
  state: UnlockComputationResult,
): boolean {
  return (
    !state.unlockedModuleIds.has(modId) &&
    !state.effectivelyCompletedIds.has(modId)
  );
}

// ---------------------------------------------------------------------------
// Source unique d'affichage d'un module côté apprenant.
// Tous les écrans élève doivent passer par cette fonction : un Terminé serveur
// n'est jamais rétrogradé par un compteur actuel, une sous-ligne ancienne ou
// un chargement en retard ; pendant le chargement on n'invente aucun statut.
// ---------------------------------------------------------------------------
export type LearnerModuleStatus = "chargement" | "termine" | "validation_en_cours" | "en_cours" | "a_faire";
export type LearnerModuleAction = "revoir" | "reprendre" | "commencer" | null;

export interface LearnerModuleDisplayInput {
  loaded: boolean;
  serverCompleted: boolean;
  quizStats?: QuizStatsLite;
  examStats?: ExamStatsLite;
  hasProgress: boolean;
  locked?: boolean;
}

export interface LearnerModuleDisplayState {
  status: LearnerModuleStatus;
  action: LearnerModuleAction;
  isDone: boolean;
  locked: boolean;
}

export function isModuleDoneForDisplay(
  serverCompleted: boolean,
  _quizStats?: QuizStatsLite,
  _examStats?: ExamStatsLite,
): boolean {
  // Terminé = uniquement le statut serveur (monotone, jamais rétrogradé).
  return serverCompleted;
}

/** Toutes les activités remises côté élève, mais le serveur n'a pas encore validé. */
export function isModuleAwaitingValidation(
  serverCompleted: boolean,
  quizStats?: QuizStatsLite,
  examStats?: ExamStatsLite,
): boolean {
  if (serverCompleted) return false;
  const hasQuizzes = (quizStats?.totalQuizzes ?? 0) > 0;
  const hasExams = (examStats?.total ?? 0) > 0;
  if (!hasQuizzes && !hasExams) return false;
  const allQuizzes = !hasQuizzes || quizStats!.completedQuizzes >= quizStats!.totalQuizzes;
  const allExams = !hasExams || examStats!.completed >= examStats!.total;
  return allQuizzes && allExams;
}

export function getLearnerModuleDisplayState(input: LearnerModuleDisplayInput): LearnerModuleDisplayState {
  if (!input.loaded) {
    return { status: "chargement", action: null, isDone: false, locked: true };
  }
  const isDone = isModuleDoneForDisplay(input.serverCompleted, input.quizStats, input.examStats);
  if (isDone) {
    // Un module terminé n'est jamais verrouillé par un ancien état client.
    return { status: "termine", action: "revoir", isDone: true, locked: false };
  }
  const locked = !!input.locked;
  if (isModuleAwaitingValidation(input.serverCompleted, input.quizStats, input.examStats)) {
    return { status: "validation_en_cours", action: locked ? null : "reprendre", isDone: false, locked };
  }
  if (input.hasProgress) {
    return { status: "en_cours", action: locked ? null : "reprendre", isDone: false, locked };
  }
  return { status: "a_faire", action: locked ? null : "commencer", isDone: false, locked };
}
