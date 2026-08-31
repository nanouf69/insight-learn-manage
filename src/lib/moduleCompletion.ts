import { supabase } from "@/integrations/supabase/client";

/**
 * Source of truth for learner module progression.
 *
 * Table: public.apprenant_module_completion
 *   - status: 'in_progress' | 'completed'   (completed = TERMINAL state)
 *   - progress: 0..100
 *   - completed_at, score_obtenu, score_max, details
 *
 * All client writes go through the atomic RPC `save_module_completion`, which
 * never downgrades a completed row and never lowers progress. A BEFORE UPDATE
 * trigger enforces the same rule for any other write path.
 */

export interface ModuleCompletionRow {
  id?: string;
  module_id: number;
  apprenant_id?: string;
  status?: string | null;
  progress?: number | null;
  completed_at?: string | null;
  score_obtenu?: number | null;
  score_max?: number | null;
  details?: any;
}

export interface SaveModuleCompletionParams {
  apprenantId: string;
  moduleId: number;
  completed: boolean;
  progress?: number;
  scoreObtenu?: number | null;
  scoreMax?: number | null;
  details?: any[] | null;
  /** Number of attempts on network/server failure (default 4) */
  retries?: number;
}

const RETRY_BASE_DELAY = 800;

/** True when the DB row means "module validated" (terminal state). */
export function isCompletionDone(row: ModuleCompletionRow | null | undefined): boolean {
  if (!row) return false;
  if (row.status === "completed") return true;
  // Legacy rows written before the status column existed.
  if (row.status == null && row.completed_at) return true;
  return false;
}

/**
 * Persist module progression on the server. Retries automatically on failure.
 * Resolves to true ONLY when the server confirmed the write.
 */
export async function saveModuleCompletion(
  params: SaveModuleCompletionParams,
): Promise<boolean> {
  const {
    apprenantId,
    moduleId,
    completed,
    progress,
    scoreObtenu = null,
    scoreMax = null,
    details = null,
    retries = 4,
  } = params;

  if (!apprenantId || !Number.isFinite(moduleId)) return false;

  const payload = {
    _apprenant_id: apprenantId,
    _module_id: Number(moduleId),
    _completed: !!completed,
    _progress: completed ? 100 : Math.max(0, Math.min(100, Math.round(progress ?? 0))),
    _score_obtenu: scoreObtenu,
    _score_max: scoreMax,
    _details: details ?? null,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error } = await (supabase as any).rpc("save_module_completion", payload);
      if (!error) return true;
      console.error(
        `[moduleCompletion] save attempt ${attempt}/${retries} failed for module ${moduleId}:`,
        error,
      );
    } catch (e) {
      console.error(
        `[moduleCompletion] save attempt ${attempt}/${retries} exception for module ${moduleId}:`,
        e,
      );
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY * attempt));
    }
  }
  return false;
}

/**
 * Load progression from the database. Retries so that a transient failure
 * (token refresh right after reconnect) never yields an empty progression,
 * which is exactly what made validated modules look locked again.
 */
export async function fetchModuleCompletions(
  apprenantId: string,
  retries = 3,
): Promise<{ rows: ModuleCompletionRow[]; ok: boolean }> {
  if (!apprenantId) return { rows: [], ok: false };

  for (let attempt = 1; attempt <= retries; attempt++) {
    const { data, error } = await supabase
      .from("apprenant_module_completion")
      .select("id, module_id, score_obtenu, score_max, completed_at, details, status, progress")
      .eq("apprenant_id", apprenantId);

    if (!error && data) return { rows: data as any as ModuleCompletionRow[], ok: true };

    console.error(
      `[moduleCompletion] load attempt ${attempt}/${retries} failed:`,
      error,
    );
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY * attempt));
    }
  }
  return { rows: [], ok: false };
}

/**
 * Self-healing: modules whose mandatory activities are all done but whose row
 * is not `completed` are validated server-side. Fixes accounts already broken
 * by the previous heuristic-based logic.
 */
export async function repairInconsistentCompletions(
  apprenantId: string,
  rows: ModuleCompletionRow[],
  shouldBeCompleted: (row: ModuleCompletionRow) => boolean,
): Promise<number> {
  const toRepair = rows.filter((r) => !isCompletionDone(r) && shouldBeCompleted(r));
  let repaired = 0;
  for (const row of toRepair) {
    const ok = await saveModuleCompletion({
      apprenantId,
      moduleId: Number(row.module_id),
      completed: true,
      scoreObtenu: row.score_obtenu ?? null,
      scoreMax: row.score_max ?? null,
      details: Array.isArray(row.details) ? row.details : null,
      retries: 2,
    });
    if (ok) {
      row.status = "completed";
      row.progress = 100;
      row.completed_at = row.completed_at || new Date().toISOString();
      repaired++;
    }
  }
  if (repaired > 0) {
    console.log(`[moduleCompletion] auto-repaired ${repaired} module(s) for ${apprenantId}`);
  }
  return repaired;
}
