import type { CoreMatiereState } from "@/lib/coreExamPublication";

/**
 * Affichage seul : une ligne refusée faute de rattachement prouvé reçoit la note
 * uniquement si TOUTES les copies serveur plausibles (même examen, matière, ±120 s)
 * sont définitives, fiables et de note identique. Sinon la ligne reste illisible.
 */
export function resoudreDoublonsConcordants<T extends Record<string, any>>(row: T, states: CoreMatiereState[], nonFiables: Set<string>): T {
  if (!row?.__core?.lectureImpossible) return row;
  const t = new Date(String(row.completed_at)).getTime();
  if (!Number.isFinite(t)) return row;
  const c = states.filter(s => !s.neutralise && s.examId === String(row.quiz_id) && s.matiereId === String(row.matiere_id)
    && (!s.resultId || s.resultId === String(row.id)) && Math.abs(new Date(s.finishedAt).getTime() - t) <= 120000);
  if (c.length < 2) return row;
  if (c.some(s => s.pending || s.status !== "definitif" || nonFiables.has(s.attemptId) || typeof s.note20 !== "number" || !Number.isFinite(s.note20))) return row;
  if (new Set(c.map(s => s.note20)).size !== 1) return row;
  const dernier = [...c].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))[0];
  return { ...row, __core: dernier, __doublonConcordant: c.length };
}
