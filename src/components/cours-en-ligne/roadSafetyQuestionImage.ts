/** Course road-safety quizzes (Parties 1/2/3) in every track module; Bilans and exams excluded. */
export function isRoadSafetyCourseExercise(exo: { id?: unknown; titre?: unknown } | null | undefined): boolean {
  if (!exo || ![80, 81, 82].includes(Number(exo.id))) return false;
  return /s[ée]curit[ée]\s+routi[èe]re\s*[—–-]\s*partie\s*[123]/i.test(String(exo.titre ?? ""));
}
