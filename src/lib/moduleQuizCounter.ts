export interface QuizCounterItem { id: string; label: string; questionIds: string[] }

/** Completed rows carry the historical perimeter; revisions never extend it. */
export function compterQuizModule(rows: any[], current: QuizCounterItem[]) {
  const terminal = rows.filter((r) => r.status === "completed" && Array.isArray(r.details) && r.details.length > 0)
    .sort((a, b) => String(a.completed_at ?? a.created_at ?? "").localeCompare(String(b.completed_at ?? b.created_at ?? "")));
  const evidence = terminal.length ? [terminal[0]] : rows;
  const groups = new Map<string, { ids: Set<string>; answered: Set<string>; label: string }>();
  for (const row of evidence) for (const d of Array.isArray(row.details) ? row.details : []) {
    if (d.exerciceId == null || d.questionId == null) continue;
    const id = String(d.exerciceId);
    const g = groups.get(id) ?? { ids: new Set<string>(), answered: new Set<string>(), label: String(d.exerciceTitre ?? id) };
    g.ids.add(String(d.questionId));
    const answer = d.reponseEleve;
    if (answer != null && String(answer).trim() !== "") g.answered.add(String(d.questionId));
    groups.set(id, g);
  }
  const required = terminal.length
    ? [...groups].map(([id, g]) => ({ id, label: current.find((q) => q.id === id)?.label ?? g.label, questionIds: [...g.ids] }))
    : current;
  const done = (q: QuizCounterItem) => {
    const g = groups.get(q.id);
    return !!g && g.answered.size > 0 && q.questionIds.every((id) => g.answered.has(id));
  };
  return { completedQuizzes: required.filter(done).length, totalQuizzes: required.length,
    completedLabels: required.filter(done).map((q) => q.label), remainingLabels: required.filter((q) => !done(q)).map((q) => q.label) };
}