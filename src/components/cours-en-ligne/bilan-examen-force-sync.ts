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

export const forceBilanExamGestionFromSource = <T extends BilanModuleData>(
  moduleId: number | string,
  loadedData: T,
  sourceData: BilanModuleData,
): T => {
  const forcedIds = BILAN_EXAMEN_FORCE_FROM_SOURCE_IDS[Number(moduleId)];
  if (!forcedIds || forcedIds.length === 0) return loadedData;

  let nextExercices = [...loadedData.exercices];
  for (const forcedId of forcedIds) {
    const sourceIndex = sourceData.exercices.findIndex(
      (exercise) => Number(exercise.id) === forcedId,
    );
    const sourceExercise = sourceData.exercices[sourceIndex];
    if (!sourceExercise) continue;
    nextExercices = nextExercices.filter(
      (exercise) => Number(exercise.id) !== forcedId,
    );
    const insertAt = Math.max(0, Math.min(sourceIndex, nextExercices.length));
    nextExercices.splice(insertAt, 0, JSON.parse(JSON.stringify(sourceExercise)));
  }

  return { ...loadedData, exercices: nextExercices };
};
