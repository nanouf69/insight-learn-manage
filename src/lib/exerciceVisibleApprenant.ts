import { exerciceRemplaceParQuizIntegres } from "@/components/cours-en-ligne/QuizExterneBilan";

/** Un quiz est affiché à l'élève seulement s'il est actif et non remplacé par un quiz intégré. */
export function exerciceVisibleApprenant(moduleId: number, exercice: { id: number | string; actif?: boolean } | null | undefined): boolean {
  return !!exercice && !!exercice.actif && !exerciceRemplaceParQuizIntegres(Number(moduleId), Number(exercice.id));
}
