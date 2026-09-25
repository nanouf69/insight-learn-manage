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

  const effectivelyCompletedIds = new Set<number>(completedModuleIds);
  modules.forEach((m) => {
    const quizStats = moduleQuizStatsById[m.id];
    const examStats = examBlancStatsById[m.id];
    const hasQuizzes = !!quizStats && quizStats.totalQuizzes > 0;
    const hasExams = !!examStats && examStats.total > 0;
    const allQuizzesDone = hasQuizzes
      ? quizStats!.completedQuizzes >= quizStats!.totalQuizzes
      : true;
    const allExamsDone = hasExams
      ? examStats!.completed >= examStats!.total
      : true;
    if ((hasQuizzes || hasExams) && allQuizzesDone && allExamsDone) {
      effectivelyCompletedIds.add(m.id);
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
      } else if (effectivelyCompletedIds.has(modules[i - 1].id)) {
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
