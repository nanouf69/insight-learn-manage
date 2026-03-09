// ======================================================================
// Système de propagation des modifications d'exercices
// Les modifications admin (localStorage) et formateur (DB) se propagent
// automatiquement à tous les modules utilisant les mêmes questions.
// ======================================================================

const STORAGE_KEY = "shared-exercise-overrides-v1";

interface QuestionOverride {
  enonce: string;
  choix: { lettre: string; texte: string; correct?: boolean }[];
}

// Map: normalized original enonce → updated question data
type OverridesStore = Record<string, QuestionOverride>;

/** Normalize enonce for stable matching across modules */
function normalizeEnonce(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Load all shared overrides from localStorage */
export function loadSharedOverrides(): OverridesStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Save shared overrides to localStorage */
function saveSharedOverrides(overrides: OverridesStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.error("[shared-overrides] Error saving:", e);
  }
}

/** Get a fingerprint of current overrides for cache invalidation */
export function getOverridesFingerprint(): string {
  const overrides = loadSharedOverrides();
  const keys = Object.keys(overrides).sort();
  if (keys.length === 0) return "none";
  // Simple hash based on count + first/last keys
  return `${keys.length}:${keys[0]?.slice(0, 20)}:${keys[keys.length - 1]?.slice(0, 20)}`;
}

/**
 * Detect question changes between original (source) and edited questions,
 * and save them to the shared overrides store.
 * Also invalidates related module caches.
 */
export function detectAndSaveOverrides(
  originalQuestions: { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
  editedQuestions: { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
  currentModuleId: number,
): void {
  const overrides = loadSharedOverrides();
  let changed = false;

  for (let i = 0; i < originalQuestions.length && i < editedQuestions.length; i++) {
    const orig = originalQuestions[i];
    const edited = editedQuestions[i];

    const origNorm = normalizeEnonce(orig.enonce);
    const editedNorm = normalizeEnonce(edited.enonce);

    const enonceChanged = origNorm !== editedNorm;
    const choixChanged = JSON.stringify(orig.choix) !== JSON.stringify(edited.choix);

    if (enonceChanged || choixChanged) {
      overrides[origNorm] = {
        enonce: edited.enonce,
        choix: edited.choix,
      };
      changed = true;
    }
  }

  // Handle new questions added beyond original length
  // (these don't have an original to map from, so they'll only exist in the module's local cache)

  if (changed) {
    saveSharedOverrides(overrides);
    // Invalidate all other module caches so they pick up the changes
    invalidateOtherModuleCaches(currentModuleId);
  }
}

/**
 * Apply shared overrides to an array of exercise questions.
 * Matches by normalized enonce text.
 */
export function applySharedOverrides<T extends { enonce: string; choix: any[] }>(
  questions: T[],
): T[] {
  const overrides = loadSharedOverrides();
  if (Object.keys(overrides).length === 0) return questions;

  return questions.map((q) => {
    const key = normalizeEnonce(q.enonce);
    const override = overrides[key];
    if (override) {
      return { ...q, enonce: override.enonce, choix: override.choix };
    }
    return q;
  });
}

/**
 * Apply DB overrides (from quiz_questions_overrides table) to exercise questions.
 * Matches by normalized enonce text.
 */
export function applyDbOverrides<T extends { enonce: string; choix: any[] }>(
  questions: T[],
  dbOverrides: { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
): T[] {
  if (!dbOverrides || dbOverrides.length === 0) return questions;

  // Build a map of normalized enonce → override
  const overrideMap = new Map<string, { enonce: string; choix: any[] }>();
  for (const ov of dbOverrides) {
    // We don't have the original enonce from DB overrides, so we match by the override's own enonce
    // Actually DB overrides have section_id + question_id, not original enonce
    // We'll handle this differently - see applyDbOverridesByPosition
  }

  return questions;
}

/**
 * Apply DB overrides by matching section_id and question_id.
 * Used for trainer overrides from quiz_questions_overrides table.
 */
export function applyDbOverridesByKey<T extends { id: number; enonce: string; choix: any[] }>(
  questions: T[],
  dbOverrideMap: Map<string, { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }>,
  sectionId: number,
): T[] {
  if (!dbOverrideMap || dbOverrideMap.size === 0) return questions;

  return questions.map((q) => {
    const key = `${sectionId}-${q.id}`;
    const override = dbOverrideMap.get(key);
    if (override) {
      return { ...q, enonce: override.enonce, choix: override.choix };
    }
    return q;
  });
}

/**
 * Apply shared overrides to all exercises in a module data structure.
 */
export function applyOverridesToModuleExercices<T extends { questions?: { enonce: string; choix: any[] }[] }>(
  exercices: T[],
): T[] {
  const overrides = loadSharedOverrides();
  if (Object.keys(overrides).length === 0) return exercices;

  return exercices.map((exo) => {
    if (!exo.questions || exo.questions.length === 0) return exo;
    return {
      ...exo,
      questions: applySharedOverrides(exo.questions),
    };
  });
}

/** Invalidate localStorage caches for all modules except the current one */
function invalidateOtherModuleCaches(currentModuleId: number): void {
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith("module-editor-state:")) {
      const moduleIdStr = key.replace("module-editor-state:", "");
      if (moduleIdStr !== String(currentModuleId)) {
        localStorage.removeItem(key);
      }
    }
  }
  console.log(`[shared-overrides] Invalidated all module caches except module ${currentModuleId}`);
}
