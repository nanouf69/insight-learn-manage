import { describe, expect, it } from "vitest";
import fixture from "./course-subject-local-browser/audited-course-fixture.json";
import { COURSE_SUBJECT_LOCAL_RULES } from "@/lib/courseSubjectLocalRules";
import { projectCourseSubjectLocalPresentation } from "@/lib/courseSubjectLocalPresentation";

describe.each([2, 10] as const)("Strict duplicate obligations in course module %i", moduleId => {
  it("retains both Gestion 62-31 and 62-50 without changing the original denominator", () => {
    const courses = fixture.courses.map((c, i) => ({ ...c, id: moduleId === 2 ? c.id : [10003,10004,10005,10006,10007,10008][i] }));
    const presentation = projectCourseSubjectLocalPresentation(moduleId, "cours-et-exercices", fixture.exercises, courses, COURSE_SUBJECT_LOCAL_RULES[0]);
    const exercise = fixture.exercises.find(e => e.id === 62);
    const first = exercise?.questions.find(q => q.id === 31);
    const second = exercise?.questions.find(q => q.id === 50);
    if (!presentation || !exercise || !first || !second) throw new Error("Missing audited originals");
    expect(first.enonce).toBe(second.enonce);
    expect(first.choix).toEqual(second.choix);
    expect(presentation.parts[3].filter(e => ["62-31", "62-50"].includes(e.answerKey)).map(e => e.answerKey)).toEqual(["62-31", "62-50"]);
    expect(presentation.parts[3]).toHaveLength(38);
    expect(exercise.questions).toHaveLength(43);
    expect(presentation.originalExercises).toBe(fixture.exercises);
  });
  it("answering 62-31 alone does not fabricate a response to 62-50", () => {
    const answers: Record<string, string> = { "62-31": "B" };
    const exercise = fixture.exercises.find(e => e.id === 62);
    if (!exercise) throw new Error("Missing audited exercise");
    const missing = exercise.questions.filter(q => !answers[`62-${q.id}`]).map(q => q.id);
    expect(missing).toContain(50);
    expect(missing).not.toContain(31);
    expect(Object.keys(answers)).toEqual(["62-31"]);
  });
});