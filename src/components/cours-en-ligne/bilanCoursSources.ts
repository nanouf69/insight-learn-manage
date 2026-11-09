import { mergeSourceExercices } from "./examens-blancs-utils";
import {
  BILAN_SOMME_COURS_SOURCES,
  type ExerciceBilanJson,
} from "@/lib/bilanCoursSommeProjection";

type ModuleDataSource = {
  exercices?: ExerciceBilanJson[];
} | null | undefined;

/**
 * Résout les sources actives d'un Bilan d'exercices.
 *
 * La version enregistrée du module de cours est autoritaire pour les questions,
 * leur contenu et leurs suppressions explicites. La source embarquée ne sert que
 * de repli structurel lorsqu'aucun état serveur n'existe encore.
 */
export function resoudreExercicesSourcesBilan({
  moduleBilanId,
  exercicesEmbarques,
  moduleDataServeur,
  deletedExercicesServeur,
}: {
  moduleBilanId: number;
  exercicesEmbarques: ExerciceBilanJson[];
  moduleDataServeur?: ModuleDataSource;
  deletedExercicesServeur?: unknown;
}): ExerciceBilanJson[] {
  const config = BILAN_SOMME_COURS_SOURCES[Number(moduleBilanId)];
  if (!config) return [];
  const sourceIds = [...new Set(Object.values(config.correspondances).flat().map(Number))];
  const embarques = exercicesEmbarques.filter((exo) => sourceIds.includes(Number(exo.id)));

  if (moduleDataServeur != null && !Array.isArray(moduleDataServeur.exercices)) {
    throw new Error(`Bilan somme des cours : module source ${config.moduleCours} illisible.`);
  }

  const exercices = moduleDataServeur?.exercices
    ? mergeSourceExercices(
        moduleDataServeur.exercices as any[],
        embarques as any[],
        (Array.isArray(deletedExercicesServeur) ? deletedExercicesServeur : [])
          .map((exo: any) => Number(exo?.id ?? exo))
          .filter(Number.isFinite),
      ) as ExerciceBilanJson[]
    : embarques;

  // Une section enregistrée vide reste une valeur explicite ; une section absente
  // de la réponse serveur retombe sur la structure embarquée via la fusion.
  return sourceIds.map((id) => {
    const source = exercices.find((exo) => Number(exo.id) === id);
    if (!source) throw new Error(`Bilan somme des cours : exercice source ${id} absent.`);
    return source;
  });
}
