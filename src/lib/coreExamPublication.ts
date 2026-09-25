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
  /** Passage copié depuis l'ancien système : identifiant de la ligne d'origine (apprenant_quiz_results.id). */
  resultId?: string | null;
  /** Tentative neutralisée (renvoyée seulement sur demande explicite, pour être écartée). */
  neutralise?: boolean;
  note20: number | null;
  /** true tant que la note serveur n'est pas publiée définitivement. */
  pending: boolean;
}

/** Fenêtre de rapprochement entre la fin du passage et la ligne de résultat. */
export const CORE_MATCH_WINDOW_MS = 2 * 60 * 1000;

export async function fetchCoreMatiereStates(apprenantId: string | null | undefined): Promise<CoreMatiereState[] | null> {
  if (!apprenantId) return [];
  const map = await fetchCoreMatiereStatesBulk([apprenantId]);
  if (!map) return null;
  return map.get(apprenantId) ?? [];
}

/**
 * Même lecture que fetchCoreMatiereStates, pour plusieurs apprenants à la fois
 * (tableau CRM « Résultats par session »). Rapprochement strict par identifiant
 * apprenant. null = lecture impossible (fail-closed).
 */
export async function fetchCoreMatiereStatesBulk(
  apprenantIds: string[],
  opts?: { inclureNeutralises?: boolean },
): Promise<Map<string, CoreMatiereState[]> | null> {
  const out = new Map<string, CoreMatiereState[]>();
  const ids = Array.from(new Set((apprenantIds || []).filter(Boolean)));
  const CHUNK = 150;
  const PAGE = 1000;
  const all = async (table: string, cols: string, chunk: string[], extra?: (q: any) => any) => {
    const rows: any[] = [];
    for (let from = 0; ; from += PAGE) {
      let q: any = supabase.from(table as any).select(cols).in("apprenant_id", chunk);
      if (extra) q = extra(q);
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...((data as any[]) || []));
      if (!data || data.length < PAGE) break;
    }
    return rows;
  };
  try {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const [attempts, qrcs, results, neutres] = await Promise.all([
        all("exam_attempts_v2", "attempt_id, apprenant_id, exam_id, finished_at, etat, is_test, matiere:snapshot->>matiere, matieres:snapshot->matieres, result_id:snapshot->source_historique->>result_id", chunk, (q) => q.eq("etat", "terminee")),
        all("qrc_instances_v2", "attempt_id, etat", chunk),
        all("core_exam_results", "attempt_id, result_revision, status, score, total, qrc_restantes", chunk),
        // Tentatives neutralisées (techniques/incomplètes) : conservées en base mais
        // jamais prises en compte dans la notation ni l'affichage.
        all("core_tentatives_neutralisees", "attempt_id", chunk),
      ]);
      const neutralises = new Set(neutres.map((n) => String(n.attempt_id)));
      const qrcByAttempt = new Map<string, { total: number; pending: number }>();
      qrcs.forEach((q) => {
        const e = qrcByAttempt.get(q.attempt_id) || { total: 0, pending: 0 };
        e.total += 1;
        if (q.etat !== "corrigee") e.pending += 1;
        qrcByAttempt.set(q.attempt_id, e);
      });
      const latestResult = new Map<string, any>();
      results.forEach((r) => {
        const prev = latestResult.get(r.attempt_id);
        if (!prev || Number(r.result_revision) > Number(prev.result_revision)) latestResult.set(r.attempt_id, r);
      });
      attempts
        .map((a) => {
          // Passage historique copié : matière unique déclarée dans le snapshot.
          if (!a?.matiere && Array.isArray(a?.matieres) && a.matieres.length === 1) {
            return { ...a, matiere: a.matieres[0]?.subject_id ?? null };
          }
          return a;
        })
        .filter((a) => a?.finished_at && a?.matiere && (opts?.inclureNeutralises || !neutralises.has(String(a.attempt_id))))
        .forEach((a) => {
          const q = qrcByAttempt.get(a.attempt_id) || { total: 0, pending: 0 };
          const r = latestResult.get(a.attempt_id);
          const score = r ? Number(r.score) : NaN;
          const total = r ? Number(r.total) : NaN;
          const note20 = Number.isFinite(score) && Number.isFinite(total) && total > 0 ? (score / total) * 20 : null;
          const qrcRestantes = Math.max(q.pending, r ? Number(r.qrc_restantes) || 0 : 0);
          const pending = !r || r.status !== "definitif" || qrcRestantes > 0 || note20 == null;
          const key = String(a.apprenant_id);
          const list = out.get(key) || [];
          list.push({
            attemptId: a.attempt_id,
            examId: String(a.exam_id),
            matiereId: String(a.matiere),
            finishedAt: a.finished_at,
            qrcTotal: q.total,
            qrcRestantes,
            status: r?.status ?? null,
            resultId: a.result_id ? String(a.result_id) : null,
            ...(neutralises.has(String(a.attempt_id)) ? { neutralise: true } : {}),
            note20,
            pending,
          });
          out.set(key, list);
        });
    }
  } catch (e) {
    console.warn("[coreExamPublication] lecture impossible:", e);
    return null;
  }
  return out;
}

/** Passage nouveau système correspondant à une ligne de résultat, ou null. */
export function matchCoreState(
  states: CoreMatiereState[] | null | undefined,
  quizId: unknown,
  matiereId: unknown,
  completedAt: unknown,
  resultId?: unknown,
): CoreMatiereState | null {
  if (!states) return null;
  // 1) Identifiant réel : passage copié depuis cette ligne précise de l'ancien système.
  if (resultId) {
    const exact = states.find((s) => s.resultId && s.resultId === String(resultId));
    if (exact) return exact;
  }
  if (!quizId || !matiereId || !completedAt) return null;
  const t = new Date(String(completedAt)).getTime();
  if (!Number.isFinite(t)) return null;
  let best: CoreMatiereState | null = null;
  let bestDiff = Infinity;
  for (const s of states) {
    if (s.examId !== String(quizId) || s.matiereId !== String(matiereId)) continue;
    // Un passage copié est lié à SA ligne d'origine : jamais rapproché par l'heure.
    if (s.resultId) continue;
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
