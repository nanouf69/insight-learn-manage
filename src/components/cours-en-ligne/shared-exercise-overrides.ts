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

export async function syncSharedExercisesToSiblingModules(
  _savedModuleId: number,
  _savedExercices: { id: number; titre?: string; sousTitre?: string; actif?: boolean; questions?: any[] }[],
  _deletedExerciceIds: number[],
): Promise<void> {
  // no-op: la sauvegarde admin n'écrase plus les modules voisins.
}
