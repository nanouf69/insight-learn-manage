/** Display coordinates only. Never feed these groups to persistence/scoring. */
export type CourseSubjectPart = 1 | 2 | 3;
export interface CourseSubjectQuestion {
  id: number | string;
  enonce?: string;
  choix?: unknown;
  image?: unknown;
  reponseQRC?: unknown;
}
export interface CourseSubjectExercise<Q extends CourseSubjectQuestion> {
  id: number;
  actif: boolean;
  questions?: readonly Q[];
}
export interface CourseSubjectMove {
  exerciseId: number;
  questionId: number | string;
  targetPart: CourseSubjectPart;
  /** Exact audited pedagogical content; changed/frozen copies stay in their source part. */
  signature: string;
  slides: readonly number[];
  reason: string;
}
export interface CourseSubjectRule {
  subject: "Gestion" | "Sécurité routière";
  exerciseIds: readonly [number, number, number];
  supportPaths: readonly [string, string, string];
  courseIds: Record<2 | 10, readonly [number, number, number]>;
  moves: readonly CourseSubjectMove[];
}
export interface CourseSubjectDisplayQuestion<Q extends CourseSubjectQuestion> {
  question: Q;
  originalExerciseId: number;
  originalIndex: number;
  answerKey: string;
  identity: string;
  label: string;
  targetPart: CourseSubjectPart;
}
export interface CourseSubjectPresentation<Q extends CourseSubjectQuestion, E extends CourseSubjectExercise<Q>> {
  rule: CourseSubjectRule;
  originalExercises: readonly E[];
  parts: Record<CourseSubjectPart, CourseSubjectDisplayQuestion<Q>[]>;
}
export function courseQuestionSignature(q: CourseSubjectQuestion): string {
  return JSON.stringify([q.enonce ?? "", q.choix ?? [], q.image ?? null, q.reponseQRC ?? null]);
}
export function projectCourseSubjectLocalPresentation<Q extends CourseSubjectQuestion, E extends CourseSubjectExercise<Q>>(
  moduleId: number,
  context: "cours-et-exercices" | "other",
  exercises: readonly E[],
  courses: readonly { id: number; actif: boolean; fichiers?: readonly { url: string }[] }[],
  rule: CourseSubjectRule,
): CourseSubjectPresentation<Q, E> | null {
  if (context !== "cours-et-exercices" || (moduleId !== 2 && moduleId !== 10)) return null;
  // New/custom PowerPoints invalidate this audit; never apply to default or other supports.
  for (const [index, courseId] of rule.courseIds[moduleId].entries()) {
    const matches = courses.filter(c => c.id === courseId && c.actif);
    if (matches.length !== 1) return null;
    const ppt = matches[0].fichiers?.filter(f => f.url.split(/[?#]/)[0].endsWith(".pptx"));
    if (ppt?.length !== 1 || ppt[0].url.split(/[?#]/)[0] !== rule.supportPaths[index]) return null;
  }
  const parts: CourseSubjectPresentation<Q, E>["parts"] = { 1: [], 2: [], 3: [] };
  const seen = new Set<string>();
  for (const [index, exerciseId] of rule.exerciseIds.entries()) {
    const matches = exercises.filter(e => e.id === exerciseId && e.actif);
    if (matches.length !== 1 || !matches[0].questions?.length) return null;
    const exercise = matches[0];
    for (const [originalIndex, question] of (exercise.questions ?? []).entries()) {
      const answerKey = `${exerciseId}-${question.id}`;
      if (seen.has(answerKey)) return null; // A conflict is not permission to deduplicate.
      seen.add(answerKey);
      const originalPart = (index + 1) as CourseSubjectPart;
      const move = rule.moves.find(m => m.exerciseId === exerciseId && String(m.questionId) === String(question.id));
      const targetPart = move?.signature === courseQuestionSignature(question) ? move.targetPart : originalPart;
      parts[targetPart].push({
        question, originalExerciseId: exerciseId, originalIndex, answerKey,
        identity: `module_${moduleId}_exo_${exerciseId}/question_${question.id}`,
        label: `${rule.subject} P${originalPart} · Q${question.id}`, targetPart,
      });
    }
  }
  return { rule, originalExercises: exercises, parts };
}