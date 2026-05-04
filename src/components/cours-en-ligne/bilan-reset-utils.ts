/**
 * Logique de reset des modules bilan générés.
 *
 * Les modules bilan (4, 9, 27, 29, 81, 82) agrègent des questions de plusieurs
 * exercices source. Leurs IDs sont renumérotés (1..N), donc si la source change,
 * les IDs peuvent décaler.
 *
 * Avant: le reset se déclenchait sur fingerprint mismatch OU duplicates.
 *   Problème: le fingerprint inclut les shared overrides (localStorage), donc
 *   il change dès qu'un admin modifie un autre module → reset → perte des modifs.
 *
 * Après: reset uniquement quand il y a des doublons réels (corruption de données).
 *   Le merge normal (mergeSourceExercices) gère les changements de source en
 *   préservant les modifications admin.
 */

export const GENERATED_BILAN_MODULE_IDS = new Set([4, 9, 27, 29, 81, 82]);

interface BilanQuestion {
  id?: number;
  enonce?: string;
  image?: string | null;
  choix?: { lettre: string; texte: string; correct?: boolean }[];
}

interface BilanExercice {
  id: number;
  questions?: BilanQuestion[];
}

interface BilanModuleData {
  id: number | string;
  exercices?: BilanExercice[];
}

/**
 * Détecte si un module bilan généré contient des questions en doublon.
 * Doublon = même exercice ID + même enonce + même image + mêmes choix.
 * Indique une corruption de données nécessitant un reset.
 */
export function hasDuplicateGeneratedBilanQuestions(data: BilanModuleData | null | undefined): boolean {
  if (!data || !GENERATED_BILAN_MODULE_IDS.has(Number(data.id))) return false;

  return (data.exercices ?? []).some((exercise) => {
    const seenQuestionKeys = new Set<string>();
    return (exercise.questions ?? []).some((question) => {
      const key = [
        Number(exercise.id),
        String(question.enonce ?? "").trim(),
        String(question.image ?? "").trim(),
        JSON.stringify((question.choix ?? []).map((choice) => ({
          lettre: choice.lettre,
          texte: choice.texte,
          correct: Boolean(choice.correct),
        }))),
      ].join("::");
      if (seenQuestionKeys.has(key)) return true;
      seenQuestionKeys.add(key);
      return false;
    });
  });
}

/**
 * Décide si on doit forcer un reset du module bilan vers les données source.
 *
 * Reset UNIQUEMENT si:
 * - C'est un module bilan généré, ET
 * - Il y a des doublons (corruption de données)
 *
 * NE déclenche PAS le reset sur fingerprint mismatch seul, car le fingerprint
 * inclut les shared overrides (localStorage) qui changent indépendamment de
 * la structure source.
 */
export function shouldForceBilanReset(
  moduleId: number | string,
  savedData: BilanModuleData | null | undefined,
): boolean {
  if (!GENERATED_BILAN_MODULE_IDS.has(Number(moduleId))) return false;
  if (hasDuplicateGeneratedBilanQuestions(savedData)) return true;

  // Module 9 (Bilan TAXI): anciens IDs d'exercices (200..206) doivent être
  // remappés vers les nouveaux IDs alignés sur le bilan VTC (100..105) pour
  // que les modifs admin se propagent automatiquement entre VTC et TAXI.
  if (Number(moduleId) === 9 && savedData?.exercices) {
    const hasLegacyTaxiIds = savedData.exercices.some((e) =>
      [200, 201, 202, 203, 204, 205, 206].includes(Number(e.id)),
    );
    if (hasLegacyTaxiIds) return true;
  }

  return false;
}
