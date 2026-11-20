import type { ReactNode } from "react";
import type { CourseSubjectExercise, CourseSubjectPart, CourseSubjectPresentation, CourseSubjectQuestion, CourseSubjectDisplayQuestion } from "@/lib/courseSubjectLocalPresentation";

/** No state or effects: each question is still rendered under its original exercise. */
export function CourseSubjectQuestionParts<Q extends CourseSubjectQuestion, E extends CourseSubjectExercise<Q>>({
  presentation, part, renderQuestion,
}: {
  presentation: CourseSubjectPresentation<Q, E>;
  part: CourseSubjectPart;
  renderQuestion: (entry: CourseSubjectDisplayQuestion<Q>) => ReactNode;
}) {
  return <section aria-label={`${presentation.rule.subject} — Partie ${part}`} className="space-y-4">
    <h3 className="text-lg font-bold">{presentation.rule.subject} — Partie {part}</h3>
    {presentation.parts[part].map(entry => <div key={entry.identity} data-course-subject-origin={entry.identity} className="space-y-2">
      <p className="text-sm font-semibold text-muted-foreground">{entry.label}</p>
      {renderQuestion(entry)}
    </div>)}
  </section>;
}