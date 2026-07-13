// ======================================================================
// ⚠️ PROPAGATION AUTOMATIQUE DÉSACTIVÉE (urgence — décision admin)
// ----------------------------------------------------------------------
// Toutes les fonctions de ce module sont volontairement neutralisées :
// elles renvoient les données telles quelles et ne touchent plus jamais
// à Supabase ni au localStorage.
//
// Raison : la propagation cross-module réécrasait les bonnes réponses
// modifiées par l'admin. On préfère perdre la propagation entre modules
// plutôt que de risquer une régression sur les corrections.
//
// Les signatures sont conservées pour la compatibilité ascendante.
// ======================================================================

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

// ---------------------------------------------------------------------------
// Propagation « safe » réactivée (2026-07) : on propage UNIQUEMENT les
// modifications identifiées par _editedAt sur la question. On ne remplace
// jamais une question cible qui a été éditée plus récemment côté admin
// (comparaison stricte des _editedAt). Le match se fait par énoncé normalisé
// pour couvrir le cas où la même question a un id différent d'un module à
// l'autre (root cause du bug historique).
// ---------------------------------------------------------------------------

const normalizeEnonce = (s: string): string =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, "")
    .trim();

const tsOf = (v: unknown): number => {
  if (!v) return 0;
  const n = new Date(String(v)).getTime();
  return Number.isFinite(n) ? n : 0;
};

export async function syncSharedExercisesToSiblingModules(
  savedModuleId: number,
  savedExercices: { id: number; titre?: string; sousTitre?: string; actif?: boolean; questions?: any[] }[],
  _deletedExerciceIds: number[],
): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");

    // Index des questions éditées dans le module sauvegardé (par énoncé normalisé)
    const editedByEnonce = new Map<string, { enonce: string; choix: any[]; editedAt: number; image?: string }>();
    for (const exo of savedExercices ?? []) {
      for (const q of (exo?.questions ?? []) as any[]) {
        const editedAt = tsOf(q?._editedAt);
        if (!editedAt) continue;
        const key = normalizeEnonce(q?.enonce ?? "");
        if (!key) continue;
        const prev = editedByEnonce.get(key);
        if (!prev || editedAt > prev.editedAt) {
          editedByEnonce.set(key, {
            enonce: q.enonce,
            choix: Array.isArray(q.choix) ? q.choix : [],
            editedAt,
            image: q.image,
          });
        }
      }
    }
    if (editedByEnonce.size === 0) return;

    const { data: rows, error } = await supabase
      .from("module_editor_state")
      .select("module_id, module_data, deleted_cours, deleted_exercices, source_fingerprint, updated_at")
      .neq("module_id", savedModuleId);
    if (error || !rows) return;

    for (const row of rows as any[]) {
      const md = row.module_data;
      if (!md || !Array.isArray(md.exercices)) continue;

      let touched = false;
      const newExercices = md.exercices.map((exo: any) => {
        if (!Array.isArray(exo?.questions)) return exo;
        let exoTouched = false;
        const newQuestions = exo.questions.map((q: any) => {
          const key = normalizeEnonce(q?.enonce ?? "");
          const edit = editedByEnonce.get(key);
          if (!edit) return q;
          const qEditedAt = tsOf(q?._editedAt);
          // Ne jamais écraser une édition plus récente
          if (qEditedAt >= edit.editedAt) return q;
          exoTouched = true;
          touched = true;
          return {
            ...q,
            enonce: edit.enonce,
            choix: edit.choix,
            _editedAt: new Date(edit.editedAt).toISOString(),
          };
        });
        return exoTouched ? { ...exo, questions: newQuestions } : exo;
      });

      if (!touched) continue;

      const savedAt = new Date().toISOString();
      const { error: upErr } = await supabase
        .from("module_editor_state")
        .upsert(
          [{
            module_id: row.module_id,
            module_data: { ...md, exercices: newExercices },
            deleted_cours: row.deleted_cours,
            deleted_exercices: row.deleted_exercices,
            source_fingerprint: row.source_fingerprint,
            updated_at: savedAt,
          }],
          { onConflict: "module_id" },
        );
      if (upErr) {
        console.error("[SharedSync] Upsert failed for module", row.module_id, upErr);
      } else {
        console.log("[SharedSync] Propagated edits to module", row.module_id);
      }
    }
  } catch (err) {
    console.error("[SharedSync] unexpected error:", err);
  }
}
