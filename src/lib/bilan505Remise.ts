import { supabase } from '@/integrations/supabase/client';
import { answersAreEqual, canQueueAnswerSaveFor, getAnswerQueueProof } from './answerPersistence';

// Production disabled until the isolated SQL contract is installed and approved.
export const bilan505RemiseActive = () => import.meta.env.DEV && location.hostname === 'localhost'
  && location.pathname === '/src/test/bilan-505-remise-browser/harness.html';

/** The learner's own clicks only (never answer keys): what the copy held vs the last proven click. */
export type RevueItem = { question_id: string; copie: unknown; dernier: unknown; certitude: 'certain' | 'ambigu';
  evenements?: number; dernier_clic_at?: string };
export type RemiseRow = { id: string; tentative: number; write_seq: number; status: string;
  reponses: Record<string, unknown>; stored_reponses: Record<string, unknown>;
  revue?: RevueItem[]; ambiguous_questions?: string[];
  grading_status?: string; unresolved_questions?: string[]; score?: number; bonnes_reponses?: number; total_questions?: number };
export type RemiseReason = 'proprietaire' | 'choix_local_plus_recent' | 'file_differente' | 'dernier_clic_a_confirmer'
  | 'difference_non_resolue' | 'choix_ambigus' | 'revue_requise' | 'corrige_snapshot_incomplet' | 'incomplete';
type Result = { ok: boolean; restored?: Record<string, unknown>; revue?: RevueItem[]; reason?: RemiseReason;
  confirmed?: RemiseRow; recovered?: boolean };
type Rpc = (row: RemiseRow, revueConfirmee: boolean) => Promise<RemiseRow>;

const rpcCall = (fn: string, apprenantId: string, answers: Record<string, unknown>): Rpc => async (r, revueConfirmee) => {
  const { data, error } = await supabase.rpc(fn as any, {
    p_apprenant_id: apprenantId, p_row_id: r.id, p_tentative: r.tentative,
    p_write_seq: r.write_seq, p_reponses: answers, p_revue_confirmee: revueConfirmee,
  } as any);
  if (error || !data) throw new Error(`${fn}_refuse`);
  return data as unknown as RemiseRow;
};

/** Only invoked by Valider; a complete row alone never expresses submission intent. */
export async function remettreBilan505(p: {
  apprenantId: string; answers: Record<string, unknown>; current: () => Record<string, unknown>;
  /** True only after the learner ticked the review of restored choices displayed on screen. */
  revueConfirmee?: boolean;
  /** A review panel is on screen: confirmation stays required even if a later save already synced the copy. */
  revueAffichee?: boolean;
  read?: () => Promise<RemiseRow>; commit?: Rpc; recover?: Rpc;
  pending?: () => ReturnType<typeof getAnswerQueueProof>; owner?: () => boolean;
}): Promise<Result> {
  const id = 'module_5_exo_505';
  const owner = p.owner ?? (() => canQueueAnswerSaveFor(p.apprenantId));
  const unchanged = () => owner() && answersAreEqual(p.current(), p.answers);
  if (!owner()) return { ok: false, reason: 'proprietaire' };
  const read = p.read ?? (async () => {
    const { data, error } = await supabase.rpc('bilan_505_remise_prepare' as any, { p_apprenant_id: p.apprenantId } as any);
    if (error || !data) throw new Error('lecture_refusee');
    return data as unknown as RemiseRow;
  });
  const row = await read();
  const revue = row.revue ?? [];
  if (!unchanged()) return { ok: false, reason: 'choix_local_plus_recent' };
  const pending = p.pending ?? (() => getAnswerQueueProof(p.apprenantId, id));
  // Conservative: old batches with different values must resolve first; no blind queue deletion.
  if (pending().some(q => q.completed || q.events.some(e => !answersAreEqual(row.reponses[e.question_id], e.valeur))
    || Object.entries(q.reponses).some(([k,v]) => !answersAreEqual(row.reponses[k],v)))) {
    return { ok: false, reason: 'file_differente', revue };
  }
  if (!answersAreEqual(row.reponses, p.answers)) {
    // Restore only server-proven last clicks over the stale copy displayed; never over a different local choice.
    if (answersAreEqual(row.stored_reponses, p.answers)) return { ok: false, restored: row.reponses, revue, reason: 'dernier_clic_a_confirmer' };
    return { ok: false, reason: 'difference_non_resolue', revue };
  }
  if ((row.ambiguous_questions ?? []).length) return { ok: false, reason: 'choix_ambigus', revue };
  const copieDifferente = !answersAreEqual(row.stored_reponses, p.answers);
  const needsReview = copieDifferente || !!p.revueAffichee;
  if (needsReview && !p.revueConfirmee) return { ok: false, reason: 'revue_requise', revue };
  if (row.grading_status !== 'verifiable') {
    // Grade blocked (e.g. answer key absent from the frozen version): recover answers only, never submit.
    if (!copieDifferente) return { ok: false, reason: 'corrige_snapshot_incomplet' };
    if (!unchanged()) return { ok: false, reason: 'choix_local_plus_recent' };
    const saved = await (p.recover ?? rpcCall('bilan_505_recuperer_reponses', p.apprenantId, p.answers))(row, true);
    const recovered = saved.id === row.id && saved.tentative === row.tentative && saved.status === 'in_progress'
      && answersAreEqual(saved.reponses, p.answers);
    return { ok: false, reason: 'corrige_snapshot_incomplet', recovered };
  }
  if (Object.keys(row.reponses).length !== 49 || Object.values(row.reponses).some(v => !Array.isArray(v) || !v.length))
    return { ok: false, reason: 'incomplete' };
  if (!unchanged()) return { ok: false, reason: 'choix_local_plus_recent' };
  const confirmed = await (p.commit ?? rpcCall('bilan_505_remise_commit', p.apprenantId, p.answers))(row, needsReview);
  const ok = unchanged() && confirmed.id === row.id
    && confirmed.tentative === row.tentative && confirmed.status === 'submitted'
    && typeof confirmed.score === 'number' && Number.isFinite(confirmed.score)
    && typeof confirmed.bonnes_reponses === 'number' && confirmed.total_questions === 49
    && answersAreEqual(confirmed.reponses, p.answers);
  return { ok, confirmed: ok ? confirmed : undefined };
}
