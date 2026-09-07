// ======================================================================
// SYNCHRONISATION DES EXERCICES PARTAGÉS ENTRE MODULES IDENTIQUES
// ----------------------------------------------------------------------
// Règle unique et non négociable :
//   « La DERNIÈRE version enregistrée par l'administrateur est toujours
//     la version de référence, partout. »
//
// Ce que fait `syncSharedExercisesToSiblingModules` :
//   - il ne propage QUE les exercices réellement modifiés par la sauvegarde
//     en cours (diff avec l'état précédent) => aucune vieille donnée ne peut
//     être réécrite par-dessus une correction plus récente ;
//   - il ne touche QUE les modules qui possèdent déjà un exercice du même id
//     (occurrences du même module) => aucune création parasite ;
//   - il supprime dans ces occurrences les exercices supprimés côté admin ;
//   - il écrit avec compare-and-swap (updated_at attendu) et une seule
//     tentative de reprise, puis diffuse un broadcast pour rafraîchir les
//     apprenants connectés immédiatement.
//
// Les anciennes fonctions d'override localStorage restent neutralisées :
// elles étaient la cause des restaurations d'anciennes réponses.
// ======================================================================

import { supabase } from "@/integrations/supabase/client";



const STORAGE_KEY = "shared-exercise-overrides-v1";

interface QuestionOverride {
  enonce: string;
  choix: { lettre: string; texte: string; correct?: boolean }[];
}

type OverridesStore = Record<string, QuestionOverride>;

export interface ModuleInitialData {
  id: number;
  nom: string;
  description?: string;
  cours: any[];
  exercices: { id: number; titre?: string; sousTitre?: string; actif?: boolean; questions?: { id?: number; enonce: string; choix: any[] }[] }[];
}

// Best-effort cleanup of the legacy localStorage cache so old overrides
// can never resurface after this kill-switch is shipped.
try {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
} catch {}

export function loadSharedOverrides(): OverridesStore {
  return {};
}

export function getOverridesFingerprint(): string {
  return "disabled";
}

export function detectAndSaveOverrides(
  _originalQuestions: { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
  _editedQuestions: { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
  _currentModuleId: number,
  _allModulesInitialData?: ModuleInitialData[],
): void {
  // no-op: propagation désactivée
}

export function applySharedOverrides<T extends { enonce: string; choix: any[] }>(
  questions: T[],
): T[] {
  return questions;
}

export function applyDbOverrides<T extends { enonce: string; choix: any[] }>(
  questions: T[],
  _dbOverrides: { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[],
): T[] {
  return questions;
}

export function applyDbOverridesByKey<T extends { id: number; enonce: string; choix: any[] }>(
  questions: T[],
  _dbOverrideMap: Map<string, { enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }>,
  _sectionId: number,
): T[] {
  return questions;
}

export function applyOverridesToModuleExercices<T extends { questions?: { enonce: string; choix: any[] }[] }>(
  exercices: (T & { id?: number })[],
): T[] {
  return exercices;
}

export async function loadCrossModuleOverridesFromDb(): Promise<OverridesStore> {
  return {};
}

export function applyCrossModuleOverrides<T extends { questions?: { enonce: string; choix: any[] }[] }>(
  exercices: (T & { id?: number })[],
  _dbOverrides: OverridesStore,
): T[] {
  return exercices;
}

type SharedExercice = { id: number; titre?: string; sousTitre?: string; actif?: boolean; questions?: any[]; [k: string]: unknown };

const stable = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const deepCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const isStaleWrite = (error: unknown) => {
  const err = error as { code?: string; message?: string } | null;
  return err?.code === "P0409" || String(err?.message ?? "").includes("stale_module_editor_state_write");
};

async function broadcastModuleUpdated(moduleId: number, at: string, from: number) {
  try {
    const channel = supabase.channel(`module-editor-live-${moduleId}`);
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 350);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    await channel.send({
      type: "broadcast",
      event: "module-updated",
      payload: { moduleId, at, syncedFrom: from },
    });
    await supabase.removeChannel(channel);
  } catch (err) {
    console.warn("[SharedSync] broadcast non bloquant échoué", moduleId, err);
  }
}

/**
 * Propage vers toutes les autres occurrences du même module les exercices que
 * l'admin vient RÉELLEMENT de modifier (et les suppressions).
 *
 * Sécurités anti-régression :
 *  - `previousExercices` obligatoire pour calculer le diff : sans changement
 *    détecté, rien n'est écrit ailleurs (donc aucune vieille version ne peut
 *    écraser une correction plus récente faite sur un autre module) ;
 *  - seuls les modules possédant déjà l'exercice sont modifiés ;
 *  - écriture en compare-and-swap avec une seule reprise en cas de conflit ;
 *  - la progression et les résultats des apprenants ne sont jamais touchés
 *    (aucune écriture hors `module_editor_state`).
 */
export async function syncSharedExercisesToSiblingModules(
  savedModuleId: number,
  savedExercices: SharedExercice[],
  deletedExerciceIds: number[],
  previousExercices?: SharedExercice[] | null,
): Promise<void> {
  try {
    const saved = Array.isArray(savedExercices) ? savedExercices : [];
    const previous = Array.isArray(previousExercices) ? previousExercices : null;
    const deletedIds = new Set((deletedExerciceIds ?? []).map(Number).filter((n) => Number.isFinite(n)));

    // 1) Exercices réellement modifiés par CETTE sauvegarde.
    const changed = new Map<number, SharedExercice>();
    if (previous) {
      const prevById = new Map<number, SharedExercice>();
      for (const exo of previous) if (exo?.id != null) prevById.set(Number(exo.id), exo);
      for (const exo of saved) {
        if (exo?.id == null) continue;
        const id = Number(exo.id);
        const before = prevById.get(id);
        if (!before || stable(before) !== stable(exo)) changed.set(id, exo);
      }
    }

    if (changed.size === 0 && deletedIds.size === 0) return;

    // 2) Occurrences du même module (rows contenant les mêmes ids d'exercice).
    const { data: rows, error } = await supabase
      .from("module_editor_state")
      .select("module_id, module_data, deleted_cours, deleted_exercices, source_fingerprint, updated_at");
    if (error) throw error;

    const at = new Date().toISOString();

    for (const row of (rows ?? []) as any[]) {
      const moduleId = Number(row?.module_id);
      if (!Number.isFinite(moduleId) || moduleId === Number(savedModuleId)) continue;

      const data: any = row?.module_data ?? null;
      const exos: SharedExercice[] = Array.isArray(data?.exercices) ? data.exercices : [];
      if (exos.length === 0) continue;

      let touched = false;
      let nextExos: SharedExercice[] = exos.map((exo) => {
        const id = Number(exo?.id);
        const incoming = changed.get(id);
        if (!incoming) return exo;
        const replacement = { ...deepCopy(incoming), _syncedFromModuleId: savedModuleId, _syncedAt: at };
        if (stable({ ...(exo as any), _syncedFromModuleId: undefined, _syncedAt: undefined }) ===
            stable({ ...(replacement as any), _syncedFromModuleId: undefined, _syncedAt: undefined })) {
          return exo;
        }
        touched = true;
        return replacement;
      });

      if (deletedIds.size > 0) {
        const filtered = nextExos.filter((exo) => !deletedIds.has(Number(exo?.id)));
        if (filtered.length !== nextExos.length) {
          nextExos = filtered;
          touched = true;
        }
      }

      if (!touched) continue;

      const nextData = { ...(data ?? {}), exercices: nextExos };
      const write = async (expectedUpdatedAt: string | null) => {
        const { error: rpcError } = await supabase.rpc("save_module_editor_state", {
          p_module_id: moduleId,
          p_module_data: nextData as any,
          p_deleted_cours: (row?.deleted_cours ?? []) as any,
          p_deleted_exercices: (row?.deleted_exercices ?? []) as any,
          p_source_fingerprint: row?.source_fingerprint ?? null,
          p_expected_updated_at: expectedUpdatedAt,
        });
        if (rpcError) throw rpcError;
      };

      try {
        await write(row?.updated_at ?? null);
      } catch (writeErr) {
        if (!isStaleWrite(writeErr)) {
          console.error("[SharedSync] écriture impossible sur le module", moduleId, writeErr);
          continue;
        }
        // Conflit : on relit l'état le plus récent et on ré-applique UNIQUEMENT
        // les exercices modifiés par cette sauvegarde (jamais tout le module).
        try {
          const { data: fresh } = await supabase
            .from("module_editor_state")
            .select("module_data, deleted_cours, deleted_exercices, source_fingerprint, updated_at")
            .eq("module_id", moduleId)
            .maybeSingle();
          const freshData: any = fresh?.module_data ?? {};
          const freshExos: SharedExercice[] = Array.isArray(freshData?.exercices) ? freshData.exercices : [];
          const merged = freshExos
            .map((exo) => {
              const incoming = changed.get(Number(exo?.id));
              return incoming ? { ...deepCopy(incoming), _syncedFromModuleId: savedModuleId, _syncedAt: at } : exo;
            })
            .filter((exo) => !deletedIds.has(Number(exo?.id)));
          const { error: retryError } = await supabase.rpc("save_module_editor_state", {
            p_module_id: moduleId,
            p_module_data: { ...freshData, exercices: merged } as any,
            p_deleted_cours: (fresh?.deleted_cours ?? []) as any,
            p_deleted_exercices: (fresh?.deleted_exercices ?? []) as any,
            p_source_fingerprint: fresh?.source_fingerprint ?? null,
            p_expected_updated_at: fresh?.updated_at ?? null,
          });
          if (retryError) throw retryError;
        } catch (retryErr) {
          console.error("[SharedSync] reprise impossible sur le module", moduleId, retryErr);
          continue;
        }
      }

      void broadcastModuleUpdated(moduleId, at, savedModuleId);
    }
  } catch (err) {
    // La synchronisation ne doit JAMAIS faire échouer la sauvegarde principale.
    console.error("[SharedSync] échec global (non bloquant)", err);
  }
}

