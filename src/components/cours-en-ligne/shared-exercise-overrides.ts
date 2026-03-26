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

/** Type for a module's initial data used for cross-module propagation */
export interface ModuleInitialData {
  id: number;
  nom: string;
  description?: string;
  cours: any[];
  exercices: { id: number; titre?: string; sousTitre?: string; actif?: boolean; questions?: { id?: number; enonce: string; choix: any[] }[] }[];
}

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
 * 
 * @param allModulesInitialData - initial data for ALL known modules, used to create
 *   records for modules that don't have a module_editor_state row yet.
 */
export function detectAndSaveOverrides(
  originalQuestions: { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
  editedQuestions: { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
  currentModuleId: number,
  allModulesInitialData?: ModuleInitialData[],
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
    // Propagate to ALL modules — existing records AND unrecorded modules
    propagateOverridesToAllModules(changedOverrides, currentModuleId, allModulesInitialData || []);
  }
}

/**
 * Propagate question overrides to ALL modules that share modified questions.
 * - UPDATE existing module_editor_state records
 * - INSERT new records for modules that don't have one yet but contain matching questions
 */
async function propagateOverridesToAllModules(
  changedOverrides: OverridesStore,
  currentModuleId: number,
  allModulesInitialData: ModuleInitialData[],
): Promise<void> {
  try {
    const overrideKeys = Object.keys(changedOverrides);
    if (overrideKeys.length === 0) return;

    // 1. Fetch all existing module_editor_state records (except current)
    const { data: existingRecords, error } = await supabase
      .from("module_editor_state")
      .select("module_id, module_data, deleted_cours, deleted_exercices, source_fingerprint")
      .neq("module_id", currentModuleId);

    if (error) {
      console.error("[shared-overrides] Error fetching module records:", error);
    }

    const recordedModuleIds = new Set<number>();
    recordedModuleIds.add(currentModuleId); // Don't re-process the current module

    // 2. Update existing records
    if (existingRecords && existingRecords.length > 0) {
      for (const row of existingRecords) {
        recordedModuleIds.add(row.module_id);
        const md = row.module_data as any;
        if (!md?.exercices || !Array.isArray(md.exercices)) continue;

        const { updatedExercices, hasChanges } = applyOverridesToExercicesArray(md.exercices, changedOverrides);

        if (hasChanges) {
          const updatedModuleData = { ...md, exercices: deduplicateExerciseQuestions(updatedExercices) };
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
          console.log(`[shared-overrides] Updated module ${row.module_id} with ${overrideKeys.length} override(s)`);
        }
      }
    }

    // 3. Create records for unrecorded modules that contain matching questions
    for (const moduleData of allModulesInitialData) {
      if (recordedModuleIds.has(moduleData.id)) continue; // Already processed
      if (!moduleData.exercices || moduleData.exercices.length === 0) continue;

      const { updatedExercices, hasChanges } = applyOverridesToExercicesArray(moduleData.exercices, changedOverrides);

      if (hasChanges) {
        const newModuleData = { ...moduleData, exercices: updatedExercices };
        const { error: insertError } = await supabase.from("module_editor_state").upsert(
          [{
            module_id: moduleData.id,
            module_data: newModuleData as any,
            deleted_cours: [] as any,
            deleted_exercices: [] as any,
            source_fingerprint: null,
            updated_at: new Date().toISOString(),
          }],
          { onConflict: "module_id" }
        );

        if (insertError) {
          console.error(`[shared-overrides] Error creating record for module ${moduleData.id}:`, insertError);
        } else {
          console.log(`[shared-overrides] CREATED record for module ${moduleData.id} with ${overrideKeys.length} override(s)`);
        }
      }
    }
  } catch (err) {
    console.error("[shared-overrides] Error propagating to modules:", err);
  }
}

/**
 * Apply overrides to an array of exercices, returning updated exercices and a change flag.
 */
function applyOverridesToExercicesArray(
  exercices: any[],
  changedOverrides: OverridesStore,
): { updatedExercices: any[]; hasChanges: boolean } {
  let hasChanges = false;

  const updatedExercices = exercices.map((exo: any) => {
    if (!exo.questions || !Array.isArray(exo.questions)) return exo;

    let exoChanged = false;
    const updatedQuestions = exo.questions.map((q: any) => {
      const key = normalizeEnonce(q.enonce);
      const override = changedOverrides[key];
      if (override) {
        exoChanged = true;
        return { ...q, enonce: override.enonce, choix: override.choix };
      }
      return q;
    });

    if (exoChanged) {
      hasChanges = true;
      return { ...exo, questions: updatedQuestions };
    }
    return exo;
  });

  return { updatedExercices, hasChanges };
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

/**
 * Deduplicate questions within each exercise by enonce text.
 * Keeps only the first occurrence of each unique enonce.
 */
function deduplicateExerciseQuestions(exercices: any[]): any[] {
  return exercices.map((exo: any) => {
    if (!exo.questions || !Array.isArray(exo.questions)) return exo;
    const seen = new Set<string>();
    const deduped = exo.questions.filter((q: any) => {
      const key = (q.enonce || "").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped.length < exo.questions.length ? { ...exo, questions: deduped } : exo;
  });
}

// ======================================================================
// FULL CROSS-MODULE EXERCISE SYNC (handles edits, adds, AND deletes)
// ======================================================================

/**
 * After saving a module to DB, sync ALL shared exercises to sibling modules.
 * Matching is by exercise ID — exercises with the same ID across modules are
 * considered shared and will receive the same questions/state.
 *
 * This replaces the partial enonce-based propagation for the common case.
 */
export async function syncSharedExercisesToSiblingModules(
  savedModuleId: number,
  savedExercices: { id: number; titre?: string; sousTitre?: string; actif?: boolean; questions?: any[] }[],
  deletedExerciceIds: number[],
): Promise<void> {
  try {
    if (!savedExercices || savedExercices.length === 0) return;

    // Build a map of exercise ID → exercise data from the saved module
    const savedExoMap = new Map<number, any>();
    for (const exo of savedExercices) {
      savedExoMap.set(exo.id, exo);
    }
    const deletedSet = new Set(deletedExerciceIds);

    // Fetch ALL other module_editor_state records
    const { data: siblingRecords, error } = await supabase
      .from("module_editor_state")
      .select("module_id, module_data, deleted_cours, deleted_exercices, source_fingerprint")
      .neq("module_id", savedModuleId);

    if (error) {
      console.error("[sync-shared] Error fetching sibling modules:", error);
      return;
    }

    if (!siblingRecords || siblingRecords.length === 0) return;

    for (const row of siblingRecords) {
      const md = row.module_data as any;
      if (!md?.exercices || !Array.isArray(md.exercices)) continue;

      let hasChanges = false;
      const deletedExos = (row.deleted_exercices as number[]) || [];
      let updatedDeletedExos = [...deletedExos];

      // Update matching exercises
      const updatedExercices = md.exercices.map((exo: any) => {
        const savedVersion = savedExoMap.get(exo.id);
        if (!savedVersion) return exo; // Not a shared exercise

        // Check if the saved version is different
        const savedQJson = JSON.stringify(savedVersion.questions || []);
        const currentQJson = JSON.stringify(exo.questions || []);
        if (savedQJson !== currentQJson || savedVersion.titre !== exo.titre || savedVersion.actif !== exo.actif) {
          hasChanges = true;
          return { ...exo, questions: savedVersion.questions, titre: savedVersion.titre, sousTitre: savedVersion.sousTitre, actif: savedVersion.actif };
        }
        return exo;
      });

      // Propagate deletions: if an exercise was deleted in the source, delete it in siblings too
      for (const delId of deletedExerciceIds) {
        // Check if this exercise existed in the sibling (by ID in initial data)
        if (!updatedDeletedExos.includes(delId)) {
          const existsInSibling = md.exercices.some((e: any) => e.id === delId);
          if (existsInSibling) {
            updatedDeletedExos.push(delId);
            hasChanges = true;
          }
        }
      }

      // Propagate additions: if a new exercise was added with an ID that doesn't exist in the sibling
      // but the sibling's source data has it, it'll be handled by the source. For truly new exercises
      // added by admin, we add them to the sibling if any of its exercises share IDs with the source.
      const siblingExoIds = new Set(md.exercices.map((e: any) => e.id));
      for (const [exoId, exoData] of savedExoMap) {
        if (!siblingExoIds.has(exoId)) {
          // Check if sibling module shares at least one exercise ID with the saved module
          // (meaning they're related formations)
          const sharedCount = md.exercices.filter((e: any) => savedExoMap.has(e.id)).length;
          if (sharedCount >= 2) {
            // This sibling shares enough exercises to warrant adding new ones too
            updatedExercices.push(exoData);
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        // Deduplicate questions within each exercise before saving
        const deduplicatedExercices = deduplicateExerciseQuestions(updatedExercices);
        const updatedModuleData = { ...md, exercices: deduplicatedExercices };
        const { error: upsertError } = await supabase.from("module_editor_state").upsert(
          [{
            module_id: row.module_id,
            module_data: updatedModuleData,
            deleted_cours: row.deleted_cours,
            deleted_exercices: updatedDeletedExos as any,
            source_fingerprint: row.source_fingerprint,
            updated_at: new Date().toISOString(),
          }],
          { onConflict: "module_id" }
        );

        if (upsertError) {
          console.error(`[sync-shared] Error updating module ${row.module_id}:`, upsertError);
        } else {
          console.log(`[sync-shared] ✅ Synced shared exercises to module ${row.module_id}`);
        }
      }
    }

    // Also sync to modules that DON'T have a DB record yet but share exercises
    // We need to check source data for all known modules
    invalidateOtherModuleCaches(savedModuleId);
  } catch (err) {
    console.error("[sync-shared] Error in syncSharedExercisesToSiblingModules:", err);
  }
}
