// Utilitaires purs pour resynchroniser les matières Bilan Examen depuis les
// données source (fichiers TypeScript = source de vérité), en écrasant les
// snapshots en base qui pourraient être obsolètes ou avoir des associations
// question/image incorrectes.

export interface BilanExerciseQuestion {
  id?: number;
  enonce?: string;
  image?: string;
  imageSize?: string;
  type?: string;
  choix?: unknown[];
  [k: string]: unknown;
}

export interface BilanExercise {
  id: number;
  titre?: string;
  sousTitre?: string;
  actif?: boolean;
  questions: BilanExerciseQuestion[];
  [k: string]: unknown;
}

export interface BilanModuleData {
  exercices: BilanExercise[];
  [k: string]: unknown;
}

export const BILAN_EXAMEN_VTC_MODULE_ID = 5;
export const BILAN_EXAMEN_TAXI_MODULE_ID = 11;

export const BILAN_EXAMEN_GESTION_EXERCISE_IDS: Record<number, number> = {
  [BILAN_EXAMEN_VTC_MODULE_ID]: 501,
  [BILAN_EXAMEN_TAXI_MODULE_ID]: 601,
};

// IDs d'exercices dont le contenu (énoncés + images + choix) doit toujours
// venir de la source, jamais du snapshot en base.
export const BILAN_EXAMEN_FORCE_FROM_SOURCE_IDS: Record<number, number[]> = {
  [BILAN_EXAMEN_VTC_MODULE_ID]: [500, 501, 502, 503, 504, 505, 506],
  [BILAN_EXAMEN_TAXI_MODULE_ID]: [600, 601, 602, 603, 604, 605, 606],
};

export const isBilanExamGestionExercise = (
  moduleId: number | string,
  exerciseId: number | string,
) => BILAN_EXAMEN_GESTION_EXERCISE_IDS[Number(moduleId)] === Number(exerciseId);

/**
 * Merge non-destructif : conserve intégralement les exercices chargés depuis la
 * base (édités par l'admin) et se contente de :
 *   1) ré-injecter un exercice source uniquement s'il est absent en base ;
 *   2) pour chaque question existante partageant le même `id` avec la source,
 *      compléter l'image UNIQUEMENT si elle est absente (`undefined`).
 *      - Une image explicitement mise à `null` (suppression admin) est respectée.
 *      - Les énoncés, choix, type, reponsesAttendues, etc. restent ceux de la base.
 */
export const forceBilanExamGestionFromSource = <T extends BilanModuleData>(
  moduleId: number | string,
  loadedData: T,
  sourceData: BilanModuleData,
): T => {
  const forcedIds = BILAN_EXAMEN_FORCE_FROM_SOURCE_IDS[Number(moduleId)];
  if (!forcedIds || forcedIds.length === 0) return loadedData;

  const nextExercices = [...loadedData.exercices];
  for (const forcedId of forcedIds) {
    const sourceIndex = sourceData.exercices.findIndex(
      (exercise) => Number(exercise.id) === forcedId,
    );
    const sourceExercise = sourceData.exercices[sourceIndex];
    if (!sourceExercise) continue;

    const loadedIndex = nextExercices.findIndex(
      (exercise) => Number(exercise.id) === forcedId,
    );

    // 1) Exercice absent en base -> on l'insère depuis la source (backfill initial)
    if (loadedIndex === -1) {
      const insertAt = Math.max(0, Math.min(sourceIndex, nextExercices.length));
      nextExercices.splice(insertAt, 0, JSON.parse(JSON.stringify(sourceExercise)));
      continue;
    }

    // 2) Exercice présent : merge par question, en préservant les édits admin
    const loadedExercise = nextExercices[loadedIndex];
    const sourceQuestionsById = new Map<number, BilanExerciseQuestion>();
    for (const q of sourceExercise.questions || []) {
      if (q?.id != null) sourceQuestionsById.set(Number(q.id), q);
    }

    const mergedQuestions = (loadedExercise.questions || []).map((q) => {
      if (q?.id == null) return q;
      const src = sourceQuestionsById.get(Number(q.id));
      if (!src) return q;
      // Backfill de l'image UNIQUEMENT si non définie côté base.
      // `null` (suppression volontaire) et toute string existante sont conservés.
      const patched: BilanExerciseQuestion = { ...q };
      if (!("image" in q) || (q as any).image === undefined) {
        if (src.image) patched.image = src.image;
      }
      if (!("imageSize" in q) || (q as any).imageSize === undefined) {
        if (src.imageSize) patched.imageSize = src.imageSize;
      }
      return patched;
    });

    nextExercices[loadedIndex] = { ...loadedExercise, questions: mergedQuestions };
  }

  return { ...loadedData, exercices: nextExercices };
};

