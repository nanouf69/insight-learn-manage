import { supabase } from "@/integrations/supabase/client";

/**
 * SOURCE UNIQUE DE L'ÉTAT QRC / NOTE D'UNE MATIÈRE D'EXAMEN BLANC.
 *
 * Règle : si la matière passée par l'élève a un passage dans le nouveau
 * système (exam_attempts_v2), l'état des QRC, le nombre de QRC restantes, le
 * statut et la note proviennent EXCLUSIVEMENT de ce passage
 * (qrc_instances_v2 + core_exam_results) — exactement ce que lit l'écran
 * Correction QRC. Sans passage nouveau système : fonctionnement historique.
 *
 * Lecture seule : aucune écriture, aucune recopie dans l'ancien système.
 */
export interface CoreMatiereState {
  attemptId: string;
  examId: string;
  matiereId: string;
  finishedAt: string;
  qrcTotal: number;
  qrcRestantes: number;
  status: string | null;
  note20: number | null;
  /** true tant que la note serveur n'est pas publiée définitivement. */
  pending: boolean;
}

/** Fenêtre de rapprochement entre la fin du passage et la ligne de résultat. */
export const CORE_MATCH_WINDOW_MS = 2 * 60 * 1000;

export async function fetchCoreMatiereStates(apprenantId: string | null | undefined): Promise<CoreMatiereState[] | null> {
  if (!apprenantId) return [];
  const [attemptsRes, qrcRes, resultsRes] = await Promise.all([
    supabase
      .from("exam_attempts_v2" as any)
      .select("attempt_id, exam_id, finished_at, etat, is_test, matiere:snapshot->>matiere")
      .eq("apprenant_id", apprenantId)
      .eq("etat", "terminee"),
    supabase
      .from("qrc_instances_v2" as any)
      .select("attempt_id, etat")
      .eq("apprenant_id", apprenantId),
    supabase
      .from("core_exam_results" as any)
      .select("attempt_id, result_revision, status, score, total, qrc_restantes")
      .eq("apprenant_id", apprenantId),
  ]);
  if (attemptsRes.error || qrcRes.error || resultsRes.error) {
    console.warn("[coreExamPublication] lecture impossible:", attemptsRes.error || qrcRes.error || resultsRes.error);
    // null = état serveur inconnu → l'appelant doit rester bloquant (fail-closed).
    return null;
  }
  const qrcByAttempt = new Map<string, { total: number; pending: number }>();
  ((qrcRes.data as any[]) || []).forEach((q) => {
    const e = qrcByAttempt.get(q.attempt_id) || { total: 0, pending: 0 };
    e.total += 1;
    if (q.etat !== "corrigee") e.pending += 1;
    qrcByAttempt.set(q.attempt_id, e);
  });
  const latestResult = new Map<string, any>();
  ((resultsRes.data as any[]) || []).forEach((r) => {
    const prev = latestResult.get(r.attempt_id);
    if (!prev || Number(r.result_revision) > Number(prev.result_revision)) latestResult.set(r.attempt_id, r);
  });
  return ((attemptsRes.data as any[]) || [])
    .filter((a) => a?.finished_at && a?.matiere)
    .map((a) => {
      const q = qrcByAttempt.get(a.attempt_id) || { total: 0, pending: 0 };
      const r = latestResult.get(a.attempt_id);
      const score = r ? Number(r.score) : NaN;
      const total = r ? Number(r.total) : NaN;
      const note20 = Number.isFinite(score) && Number.isFinite(total) && total > 0 ? (score / total) * 20 : null;
      const qrcRestantes = Math.max(q.pending, r ? Number(r.qrc_restantes) || 0 : 0);
      const pending = !r || r.status !== "definitif" || qrcRestantes > 0 || note20 == null;
      return {
        attemptId: a.attempt_id,
        examId: String(a.exam_id),
        matiereId: String(a.matiere),
        finishedAt: a.finished_at,
        qrcTotal: q.total,
        qrcRestantes,
        status: r?.status ?? null,
        note20,
        pending,
      };
    });
}

/** Passage nouveau système correspondant à une ligne de résultat, ou null. */
export function matchCoreState(
  states: CoreMatiereState[] | null | undefined,
  quizId: unknown,
  matiereId: unknown,
  completedAt: unknown,
): CoreMatiereState | null {
  if (!states || !quizId || !matiereId || !completedAt) return null;
  const t = new Date(String(completedAt)).getTime();
  if (!Number.isFinite(t)) return null;
  let best: CoreMatiereState | null = null;
  let bestDiff = Infinity;
  for (const s of states) {
    if (s.examId !== String(quizId) || s.matiereId !== String(matiereId)) continue;
    const diff = Math.abs(new Date(s.finishedAt).getTime() - t);
    if (diff <= CORE_MATCH_WINDOW_MS && diff < bestDiff) { best = s; bestDiff = diff; }
  }
  return best;
}

/** Score affiché issu du nouveau système (uniquement si publié définitivement). */
export function coreStateScore(core: CoreMatiereState | null | undefined) {
  if (!core || core.pending || core.note20 == null) return null;
  const note = Math.min(20, Math.max(0, core.note20));
  return { scoreObtenu: note, scoreMax: 20, noteSur20: note };
}
