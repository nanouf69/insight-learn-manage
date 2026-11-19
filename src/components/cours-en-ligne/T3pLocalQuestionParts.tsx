import type { ReactNode } from "react";
import type { T3pDisplayQuestion, T3pExercise, T3pLocalPresentation, T3pQuestion } from "@/lib/t3pLocalPresentation";

/** Prepared, intentionally not mounted by ModuleDetailView until integrated-flow proof exists.
 * The caller renders the existing question with its ORIGINAL exercise context.
 * No answer state, scoring, transport, auto-completion or page identity lives here.
 */
export function T3pLocalQuestionParts<Q extends T3pQuestion, E extends T3pExercise<Q>>({
  presentation, part, renderQuestion,
}: {
  presentation: T3pLocalPresentation<Q, E>;
  part: 1 | 2;
  renderQuestion: (entry: T3pDisplayQuestion<Q>) => ReactNode;
}) {
  return (
    <section aria-label={`T3P — Partie ${part}`} className="space-y-4">
      <h3 className="text-lg font-bold">T3P — Partie {part}</h3>
      {presentation.parts[part].map(entry => (
        <div key={entry.identity} data-t3p-origin={entry.identity} className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">{entry.label}</p>
          {renderQuestion(entry)}
        </div>
      ))}
    </section>
  );
}