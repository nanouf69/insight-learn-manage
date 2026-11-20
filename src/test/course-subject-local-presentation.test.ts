import { describe, expect, it } from "vitest";
import fixture from "./course-subject-local-browser/audited-course-fixture.json";
import { COURSE_SUBJECT_LOCAL_RULES } from "@/lib/courseSubjectLocalRules";
import { projectCourseSubjectLocalPresentation, type CourseSubjectExercise, type CourseSubjectQuestion } from "@/lib/courseSubjectLocalPresentation";

const moves = [[62,8,2], [62,32,1], [62,46,2], [62,53,1], [62,54,2],
  [81,43,3], [81,44,1], [81,45,3], [81,46,3], [81,47,3], [81,48,3], [81,49,3], [82,17,2], [82,55,2]];
function courses(moduleId: 2 | 10) {
  return structuredClone(fixture.courses).map((c, i) => ({ ...c, id: moduleId === 2 ? c.id : [10003,10004,10005,10006,10007,10008][i] }));
}
describe.each([2,10] as const)("Local course parts module %i", moduleId => {
  for (const [exerciseId,questionId,targetPart] of moves) {
    it(`keeps original ${exerciseId}-${questionId} while displaying part ${targetPart}`, () => {
      const rule = COURSE_SUBJECT_LOCAL_RULES.find(r => r.exerciseIds.includes(exerciseId));
      if (!rule) throw new Error("Missing audited rule");
      const projection = projectCourseSubjectLocalPresentation(moduleId,"cours-et-exercices",fixture.exercises,courses(moduleId),rule);
      const entry = projection?.parts[targetPart as 1|2|3].find(e => e.answerKey === `${exerciseId}-${questionId}`);
      expect(entry?.identity).toBe(`module_${moduleId}_exo_${exerciseId}/question_${questionId}`);
      expect(entry?.question).toBe(fixture.exercises.find(e => e.id === exerciseId)?.questions.find(q => q.id === questionId));
      expect(projection?.originalExercises).toBe(fixture.exercises);
    });
  }
  it("preserves all 386 identities exactly once, source arrays and scores inputs", () => {
    const before = JSON.stringify(fixture);
    const entries = COURSE_SUBJECT_LOCAL_RULES.flatMap(rule => {
      const p = projectCourseSubjectLocalPresentation(moduleId,"cours-et-exercices",fixture.exercises,courses(moduleId),rule);
      return p ? Object.values(p.parts).flat() : [];
    });
    expect(entries).toHaveLength(386);
    expect(new Set(entries.map(e => e.identity)).size).toBe(386);
    expect(entries.map(e => e.answerKey).sort()).toEqual(fixture.exercises.flatMap(e => e.questions.map(q => `${e.id}-${q.id}`)).sort());
    expect(JSON.stringify(fixture)).toBe(before);
  });
  it("keeps URSSAF questions in P2 because the actual P2 slide 19 covers them", () => {
    const p = projectCourseSubjectLocalPresentation(moduleId,"cours-et-exercices",fixture.exercises,courses(moduleId),COURSE_SUBJECT_LOCAL_RULES[0]);
    expect(p?.parts[2].filter(e => ["61-28","61-30"].includes(e.answerKey)).map(e => e.answerKey)).toEqual(["61-28","61-30"]);
  });
  it("guards changed questions and permits existing equal question IDs across exercises", () => {
    const copy = structuredClone(fixture.exercises);
    const exo = copy.find(e => e.id === 62);
    const q = exo?.questions.find(q => q.id === 8);
    if (!q) throw new Error("Missing fixture question");
    q.enonce += " edited";
    const p = projectCourseSubjectLocalPresentation(moduleId,"cours-et-exercices",copy,courses(moduleId),COURSE_SUBJECT_LOCAL_RULES[0]);
    expect(p?.parts[3].some(e => e.answerKey === "62-8")).toBe(true);
    expect(p?.parts[2].some(e => e.answerKey === "62-8")).toBe(false);
    expect(p?.parts[2].some(e => e.answerKey === "61-8")).toBe(true);
  });
  it("refuses duplicate internal identities and custom PowerPoints", () => {
    const copy: CourseSubjectExercise<CourseSubjectQuestion>[] = structuredClone(fixture.exercises);
    const first = copy[0].questions?.[0];
    if (!first) throw new Error("Missing fixture question");
    copy[0] = { ...copy[0], questions: [...(copy[0].questions ?? []), first] };
    const rule = COURSE_SUBJECT_LOCAL_RULES[0];
    expect(projectCourseSubjectLocalPresentation(moduleId,"cours-et-exercices",copy,courses(moduleId),rule)).toBeNull();
    const custom = courses(moduleId); custom[0].fichiers[1].url = "/custom.pptx";
    expect(projectCourseSubjectLocalPresentation(moduleId,"cours-et-exercices",fixture.exercises,custom,rule)).toBeNull();
  });
  it("keeps every image-bound P1 safety question and original exclusion membership", () => {
    const p = projectCourseSubjectLocalPresentation(moduleId,"cours-et-exercices",fixture.exercises,courses(moduleId),COURSE_SUBJECT_LOCAL_RULES[1]);
    for (const id of [71,79,108,113]) expect(p?.parts[1].some(e => e.answerKey === `80-${id}`)).toBe(true);
    expect(Object.values(p?.parts ?? {}).flat().some(e => e.answerKey === "82-76")).toBe(false);
  });
});
it("never projects standalone quizzes, Bilans, exams, other modules or contexts", () => {
  for (const rule of COURSE_SUBJECT_LOCAL_RULES) {
    for (const id of [4,9,14,15,20,21,35,39]) expect(projectCourseSubjectLocalPresentation(id,"cours-et-exercices",fixture.exercises,fixture.courses,rule)).toBeNull();
    expect(projectCourseSubjectLocalPresentation(2,"other",fixture.exercises,fixture.courses,rule)).toBeNull();
  }
});