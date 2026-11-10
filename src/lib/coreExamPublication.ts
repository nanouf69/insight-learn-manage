import { supabase } from "@/integrations/supabase/client";
import { nativeResultMatchesAnswers } from "./nativeExamResultIdentity";

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
  /** Optional read-only publication evidence for administrative diagnostics. */
  publishedAt?: string | null;
  isTest?: boolean;
  /** Passage copié depuis l'ancien système : identifiant de la ligne d'origine (apprenant_quiz_results.id). */
  resultId?: string | null;
  /** Tentative neutralisée (renvoyée seulement sur demande explicite, pour être écartée). */
  neutralise?: boolean;
  note20: number | null;
  /** true tant que la note serveur n'est pas publiée définitivement. */
  pending: boolean;
  apprenantId?: string;
  tentative?: number | null;
  qrcProofs?: Array<{ questionId: string; reponse: unknown; etat: string; note: number | null }>;
  answers?: Record<string, unknown>;
  historicalDetails?: any;
  questions?: any[];
  matiereNom?: string | null;
  noteEliminatoire?: number | null;
  noteSur?: number | null;
  coefficient?: number | null;
  duree?: number | null;
  candidateResultIds?: string[];
  /** One-to-one result/attempt proof from frozen answers, without timestamp matching. */
  provenResultIds?: string[];
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
  // Pagination par clé primaire : sans ordre stable, deux pages successives peuvent
  // répéter ou omettre des lignes (> 1000), et une copie corrigée paraître « en attente ».
  const PK: Record<string, string> = {
    exam_attempts_v2: "attempt_id", qrc_instances_v2: "qrc_instance_id", core_exam_results: "result_id",
    core_tentatives_neutralisees: "attempt_id", apprenant_quiz_results: "id", answer_state: "response_id",
    core_exam_resets: "reset_id",
  };
  const all = async (table: string, cols: string, chunk: string[], extra?: (q: any) => any) => {
    const rows: any[] = [];
    for (let from = 0; ; from += PAGE) {
      let q: any = supabase.from(table as any).select(cols).in("apprenant_id", chunk);
      if (extra) q = extra(q);
      q = q.order(PK[table], { ascending: true });
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
      const [attempts, qrcs, results, neutres, legacyResults, answers, resets] = await Promise.all([
        all("exam_attempts_v2", "attempt_id, apprenant_id, exam_id, finished_at, etat, is_test, matiere:snapshot->>matiere, matieres:snapshot->matieres, questions:snapshot->questions, result_id:snapshot->source_historique->>result_id, historique:snapshot->source_historique, tentative:snapshot->>tentative", chunk, (q) => q.eq("etat", "terminee")),
        all("qrc_instances_v2", "attempt_id, question_id, reponse, etat, note", chunk),
        all("core_exam_results", "attempt_id, result_revision, status, score, total, qrc_restantes, published_at", chunk),
        // Tentatives neutralisées (techniques/incomplètes) : conservées en base mais
        // jamais prises en compte dans la notation ni l'affichage.
        all("core_tentatives_neutralisees", "attempt_id", chunk),
        all("apprenant_quiz_results", "id, apprenant_id, quiz_id, matiere_id, completed_at, tentative, details", chunk),
        all("answer_state", "attempt_id, question_id, valeur", chunk),
        all("core_exam_resets", "archived_attempt_ids, archived_legacy_result_ids", chunk),
      ]);
      const neutralises = new Set(neutres.map((n) => String(n.attempt_id)));
      const archivedAttempts = new Set(resets.flatMap(r => r.archived_attempt_ids ?? []).map(String));
      const archivedResults = new Set(resets.flatMap(r => r.archived_legacy_result_ids ?? []).map(String));
      const qrcByAttempt = new Map<string, { total: number; pending: number }>();
      qrcs.forEach((q) => {
        const e = qrcByAttempt.get(q.attempt_id) || { total: 0, pending: 0 };
        e.total += 1;
        if (q.etat !== "corrigee" || q.note == null) e.pending += 1;
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
        .filter((a) => a?.finished_at && a?.matiere && !archivedAttempts.has(String(a.attempt_id)) && (opts?.inclureNeutralises || !neutralises.has(String(a.attempt_id))))
        .forEach((a) => {
          const q = qrcByAttempt.get(a.attempt_id) || { total: 0, pending: 0 };
          const r = latestResult.get(a.attempt_id);
          const score = r?.score != null ? Number(r.score) : NaN;
          const total = r?.total != null ? Number(r.total) : NaN;
          // core_exam_results.score est déjà la note sur 20 calculée par core_note_attempt.
          // total est le barème brut du snapshot : ne jamais normaliser une seconde fois.
          const note20 = Number.isFinite(score) && Number.isFinite(total) && total > 0 ? score : null;
          const qrcRestantes = Math.max(q.pending, r ? Number(r.qrc_restantes) || 0 : 0);
          const pending = !r || r.status !== "definitif" || qrcRestantes > 0 || note20 == null;
          const key = String(a.apprenant_id);
          const list = out.get(key) || [];
          const meta = (Array.isArray(a.matieres) ? a.matieres : []).find((m: any) => String(m?.subject_id ?? "") === String(a.matiere)) ?? null;
          const nombreOuNull = (value: unknown) => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
          list.push({
            attemptId: a.attempt_id,
            examId: String(a.exam_id),
            matiereId: String(a.matiere),
            finishedAt: a.finished_at,
            qrcTotal: q.total,
            qrcRestantes,
            status: r?.status ?? null,
            publishedAt: r?.published_at ?? null,
            isTest: a.is_test === true,
            resultId: a.result_id ? String(a.result_id) : null,
            ...(neutralises.has(String(a.attempt_id)) ? { neutralise: true } : {}),
            note20,
            pending,
            apprenantId: key,
            tentative: a.tentative != null ? Number(a.tentative) : a.historique?.tentative ?? null,
            historicalDetails: a.historique?.details,
            answers: Object.fromEntries(answers.filter(v => v.attempt_id === a.attempt_id).map(v => [String(v.question_id), v.valeur])),
            questions: a.questions,
            matiereNom: meta?.titre ?? null,
            noteEliminatoire: nombreOuNull(meta?.note_eliminatoire),
            noteSur: nombreOuNull(meta?.note_sur),
            coefficient: nombreOuNull(meta?.coefficient),
            duree: nombreOuNull(meta?.duree),
            candidateResultIds: legacyResults.filter((l) => String(l.apprenant_id) === key && l.quiz_id === a.exam_id && l.matiere_id === a.matiere && Math.abs(new Date(l.completed_at).getTime() - new Date(a.finished_at).getTime()) <= CORE_MATCH_WINDOW_MS && (a.tentative == null || l.tentative == null || Number(a.tentative) === Number(l.tentative))).map((l) => String(l.id)),
            qrcProofs: qrcs.filter((q) => q.attempt_id === a.attempt_id).map((q) => ({ questionId: String(q.question_id), reponse: q.reponse, etat: q.etat, note: q.note == null ? null : Number(q.note) })),
          });
          out.set(key, list);
        });
      for (const key of chunk) {
        const list = out.get(key) ?? [];
        const matches = new Map<string, string[]>();
        for (const state of list.filter(s => !s.resultId && !s.neutralise)) {
          matches.set(state.attemptId, legacyResults.filter(l => !archivedResults.has(String(l.id))
            && String(l.apprenant_id) === key && l.quiz_id === state.examId && l.matiere_id === state.matiereId
            && (state.tentative == null || l.tentative == null || Number(l.tentative) === state.tentative)
            && nativeResultMatchesAnswers(state, l.details)).map(l => String(l.id)));
        }
        for (const state of list) {
          const candidates = matches.get(state.attemptId) ?? [];
          state.provenResultIds = candidates.length === 1 && [...matches.values()].filter(ids => ids.includes(candidates[0])).length === 1 ? candidates : [];
        }
      }
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
  tentative?: unknown,
  apprenantId?: unknown,
): CoreMatiereState | null {
  if (!states) return null;
  const scoped = states.filter((s) => (!apprenantId || !s.apprenantId || s.apprenantId === String(apprenantId)) && s.examId === String(quizId) && s.matiereId === String(matiereId));
  // 1) Identifiant réel : passage copié depuis cette ligne précise de l'ancien système.
  if (resultId) {
    const exact = scoped.filter((s) => s.resultId && s.resultId === String(resultId));
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) return null;
    const native = scoped.filter(s => s.provenResultIds?.includes(String(resultId)));
    if (native.length === 1) return native[0];
    if (native.length > 1) return null;
  }
  if (!quizId || !matiereId || !completedAt) return null;
  const t = new Date(String(completedAt)).getTime();
  if (!Number.isFinite(t)) return null;
  const candidates: CoreMatiereState[] = [];
  for (const s of scoped) {
    if (s.examId !== String(quizId) || s.matiereId !== String(matiereId)) continue;
    // Un passage copié est lié à SA ligne d'origine : jamais rapproché par l'heure.
    if (s.resultId) continue;
    if (resultId && s.candidateResultIds && (s.candidateResultIds.length !== 1 || s.candidateResultIds[0] !== String(resultId))) continue;
    if (tentative != null && s.tentative != null && Number(tentative) !== s.tentative) continue;
    const diff = Math.abs(new Date(s.finishedAt).getTime() - t);
    if (diff <= CORE_MATCH_WINDOW_MS) candidates.push(s);
  }
  return candidates.length === 1 ? candidates[0] : null;
}

/** Score affiché issu du nouveau système (uniquement si publié définitivement). */
export function coreStateScore(core: CoreMatiereState | null | undefined) {
  if (!core || core.pending || core.note20 == null) return null;
  const note = Math.min(20, Math.max(0, core.note20));
  return { scoreObtenu: note, scoreMax: 20, noteSur20: note };
}
