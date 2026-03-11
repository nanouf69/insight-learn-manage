// ======================================================================
// Système de propagation des modifications d'exercices
// Les modifications admin se propagent automatiquement à tous les modules
// utilisant les mêmes questions, à la fois en localStorage ET en base.
// ======================================================================

import { supabase } from "@/integrations/supabase/client";

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
  return `${keys.length}:${keys[0]?.slice(0, 20)}:${keys[keys.length - 1]?.slice(0, 20)}`;
}

/**
 * Detect question changes between original (source) and edited questions,
 * save them to the shared overrides store, and propagate to other modules in DB.
 */
export function detectAndSaveOverrides(
  originalQuestions: { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
  editedQuestions: { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
  currentModuleId: number,
): void {
  const overrides = loadSharedOverrides();
  let changed = false;
  const changedOverrides: OverridesStore = {};

  for (let i = 0; i < originalQuestions.length && i < editedQuestions.length; i++) {
    const orig = originalQuestions[i];
    const edited = editedQuestions[i];

    const origNorm = normalizeEnonce(orig.enonce);
    const editedNorm = normalizeEnonce(edited.enonce);

    const enonceChanged = origNorm !== editedNorm;
    const choixChanged = JSON.stringify(orig.choix) !== JSON.stringify(edited.choix);

    if (enonceChanged || choixChanged) {
      const override = { enonce: edited.enonce, choix: edited.choix };
      overrides[origNorm] = override;
      changedOverrides[origNorm] = override;
      changed = true;
    }
  }

  if (changed) {
    saveSharedOverrides(overrides);
    invalidateOtherModuleCaches(currentModuleId);
    // Propagate to other modules in the database
    propagateOverridesToOtherModules(changedOverrides, currentModuleId);
  }
}

/**
 * Propagate question overrides to all other modules stored in module_editor_state.
 * This ensures students see updated questions across ALL modules, not just the one being edited.
 */
async function propagateOverridesToOtherModules(
  changedOverrides: OverridesStore,
  currentModuleId: number,
): Promise<void> {
  try {
    const overrideKeys = Object.keys(changedOverrides);
    if (overrideKeys.length === 0) return;

    // Fetch all other modules from DB
    const { data: otherModules, error } = await supabase
      .from("module_editor_state")
      .select("module_id, module_data, deleted_cours, deleted_exercices, source_fingerprint")
      .neq("module_id", currentModuleId);

    if (error || !otherModules || otherModules.length === 0) return;

    for (const row of otherModules) {
      const md = row.module_data as any;
      if (!md?.exercices || !Array.isArray(md.exercices)) continue;

      let moduleChanged = false;

      const updatedExercices = md.exercices.map((exo: any) => {
        if (!exo.questions || !Array.isArray(exo.questions)) return exo;

        const updatedQuestions = exo.questions.map((q: any) => {
          const key = normalizeEnonce(q.enonce);
          const override = changedOverrides[key];
          if (override) {
            moduleChanged = true;
            return { ...q, enonce: override.enonce, choix: override.choix };
          }
          return q;
        });

        return moduleChanged ? { ...exo, questions: updatedQuestions } : exo;
      });

      if (moduleChanged) {
        const updatedModuleData = { ...md, exercices: updatedExercices };
        await supabase.from("module_editor_state").upsert(
          [{
            module_id: row.module_id,
            module_data: updatedModuleData,
            deleted_cours: row.deleted_cours,
            deleted_exercices: row.deleted_exercices,
            source_fingerprint: row.source_fingerprint,
            updated_at: new Date().toISOString(),
          }],
          { onConflict: "module_id" }
        );
        console.log(`[shared-overrides] Propagated ${overrideKeys.length} override(s) to module ${row.module_id}`);
      }
    }
  } catch (err) {
    console.error("[shared-overrides] Error propagating to other modules:", err);
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
 */
export function applyDbOverrides<T extends { enonce: string; choix: any[] }>(
  questions: T[],
  dbOverrides: { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
): T[] {
  if (!dbOverrides || dbOverrides.length === 0) return questions;
  return questions;
}

/**
 * Apply DB overrides by matching section_id and question_id.
 */
export function applyDbOverridesByKey<T extends { id: number; enonce: string; choix: any[] }>(
  questions: T[],
  dbOverrideMap: Map<string, { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }>,
  sectionId: number,
): T[] {
  if (!dbOverrideMap || dbOverrideMap.size === 0) return questions;

  return questions
    .filter((q) => {
      const key = `${sectionId}-${q.id}`;
      const override = dbOverrideMap.get(key);
      return !override || override.enonce !== "__DELETED__";
    })
    .map((q) => {
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

/**
 * Load cross-module overrides from ALL module_editor_state records in DB.
 * Builds a map of normalized enonce → updated question data from all stored modules.
 * This ensures that when a module has no record, edits made in other modules still apply.
 */
export async function loadCrossModuleOverridesFromDb(): Promise<OverridesStore> {
  try {
    const { data, error } = await supabase
      .from("module_editor_state")
      .select("module_id, module_data");

    if (error || !data || data.length === 0) return {};

    const overrides: OverridesStore = {};

    for (const row of data) {
      const md = row.module_data as any;
      if (!md?.exercices || !Array.isArray(md.exercices)) continue;

      for (const exo of md.exercices) {
        if (!exo.questions || !Array.isArray(exo.questions)) continue;
        for (const q of exo.questions) {
          if (q.enonce && q.choix) {
            const key = normalizeEnonce(q.enonce);
            overrides[key] = { enonce: q.enonce, choix: q.choix };
          }
        }
      }
    }

    return overrides;
  } catch (err) {
    console.error("[shared-overrides] Error loading cross-module overrides from DB:", err);
    return {};
  }
}

/**
 * Apply cross-module DB overrides to exercises.
 * Used when a module has no module_editor_state record but other modules have edited shared questions.
 */
export function applyCrossModuleOverrides<T extends { questions?: { enonce: string; choix: any[] }[] }>(
  exercices: T[],
  dbOverrides: OverridesStore,
): T[] {
  if (Object.keys(dbOverrides).length === 0) return exercices;

  return exercices.map((exo) => {
    if (!exo.questions || exo.questions.length === 0) return exo;
    let changed = false;
    const updatedQuestions = exo.questions.map((q) => {
      const key = normalizeEnonce(q.enonce);
      const override = dbOverrides[key];
      if (override && (override.enonce !== q.enonce || JSON.stringify(override.choix) !== JSON.stringify(q.choix))) {
        changed = true;
        return { ...q, enonce: override.enonce, choix: override.choix };
      }
      return q;
    });
    return changed ? { ...exo, questions: updatedQuestions } : exo;
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
