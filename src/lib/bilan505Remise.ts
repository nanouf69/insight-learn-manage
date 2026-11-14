import { supabase } from '@/integrations/supabase/client';
import { answersAreEqual, canQueueAnswerSaveFor, getAnswerQueueProof } from './answerPersistence';

// Production disabled until the isolated SQL contract is installed and approved.
export const bilan505RemiseActive = () => import.meta.env.DEV && location.hostname === 'localhost'
  && location.pathname === '/src/test/bilan-505-remise-browser/harness.html';

export type RemiseRow = { id: string; tentative: number; write_seq: number; status: string;
  reponses: Record<string, unknown>; stored_reponses: Record<string, unknown>;
  grading_status?: string; unresolved_questions?: string[]; score?: number; bonnes_reponses?: number; total_questions?: number };
type Result = { ok: boolean; restored?: Record<string, unknown>; reason?: string };

/** Only invoked by Valider; a complete row alone never expresses submission intent. */
export async function remettreBilan505(p: {
  apprenantId: string; answers: Record<string, unknown>; current: () => Record<string, unknown>;
  read?: () => Promise<RemiseRow>; commit?: (row: RemiseRow) => Promise<RemiseRow>;
  pending?: () => ReturnType<typeof getAnswerQueueProof>; owner?: () => boolean;
}): Promise<Result> {
  const id = 'module_5_exo_505';
  const owner = p.owner ?? (() => canQueueAnswerSaveFor(p.apprenantId));
  if (!owner()) return { ok: false, reason: 'proprietaire' };
  const read = p.read ?? (async () => {
    const { data, error } = await supabase.rpc('bilan_505_remise_prepare' as any, { p_apprenant_id: p.apprenantId } as any);
    if (error || !data) throw new Error('lecture_refusee');
    return data as unknown as RemiseRow;
  });
  const row = await read();
  if (row.grading_status !== 'verifiable') return { ok: false, reason: 'corrige_snapshot_incomplet' };
  if (!owner() || !answersAreEqual(p.current(), p.answers)) return { ok: false, reason: 'choix_local_plus_recent' };
  const pending = p.pending ?? (() => getAnswerQueueProof(p.apprenantId, id));
  // Conservative: old batches with different values must resolve first; no blind queue deletion.
  if (pending().some(q => q.completed || q.events.some(e => !answersAreEqual(row.reponses[e.question_id], e.valeur))
    || Object.entries(q.reponses).some(([k,v]) => !answersAreEqual(row.reponses[k],v)))) {
    return { ok: false, reason: 'file_differente' };
  }
  if (!answersAreEqual(row.reponses, p.answers)) {
    if (answersAreEqual(row.stored_reponses, p.answers)) return { ok: false, restored: row.reponses, reason: 'dernier_clic_a_confirmer' };
    return { ok: false, reason: 'difference_non_resolue' };
  }
  if (Object.keys(row.reponses).length !== 49 || Object.values(row.reponses).some(v => !Array.isArray(v) || !v.length))
    return { ok: false, reason: 'incomplete' };
  if (!owner() || !answersAreEqual(p.current(), p.answers)) return { ok: false, reason: 'choix_local_plus_recent' };
  const commit = p.commit ?? (async (r: RemiseRow) => {
    const { data, error } = await supabase.rpc('bilan_505_remise_commit' as any, {
      p_apprenant_id: p.apprenantId, p_row_id: r.id, p_tentative: r.tentative,
      p_write_seq: r.write_seq, p_reponses: p.answers,
    } as any);
    if (error || !data) throw new Error('remise_refusee');
    return data as unknown as RemiseRow;
  });
  const confirmed = await commit(row);
  return { ok: owner() && answersAreEqual(p.current(), p.answers) && confirmed.id === row.id
    && confirmed.tentative === row.tentative && confirmed.status === 'submitted'
    && typeof confirmed.score === 'number' && Number.isFinite(confirmed.score)
    && typeof confirmed.bonnes_reponses === 'number' && confirmed.total_questions === 49
    && answersAreEqual(confirmed.reponses, p.answers) };
}