import { supabase } from '@/integrations/supabase/client';

export interface ArchivedExamReset {
  reset_id: string;
  apprenant_id: string;
  exam_id: string;
  cutoff_at: string;
  archived_attempt_ids: string[];
  archived_core_result_ids: string[];
  archived_legacy_result_ids: string[];
}
export interface ResetCancellationContext {
  reset_id: string;
  apprenant_id: string;
  exam_id: string;
  cutoff_at: string;
  eligible: boolean;
  reason: string;
  cancelled: boolean;
}
export function exactCancellationContext(row: ArchivedExamReset, context: ResetCancellationContext): boolean {
  return row.reset_id === context.reset_id && row.apprenant_id === context.apprenant_id
    && row.exam_id === context.exam_id && row.cutoff_at === context.cutoff_at;
}
/** SELECT only. The candidate server dependency is deliberately not installed. */
export async function readArchivedExamResets(account: string): Promise<ArchivedExamReset[]> {
  const rows: ArchivedExamReset[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('core_exam_resets')
      .select('reset_id,apprenant_id,exam_id,cutoff_at,archived_attempt_ids,archived_core_result_ids,archived_legacy_result_ids')
      .eq('apprenant_id', account).order('cutoff_at', { ascending: false }).order('reset_id')
      .range(offset, offset + 999);
    if (error) throw error;
    const page = (data ?? []) as ArchivedExamReset[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}
export async function readResetCancellationContext(row: ArchivedExamReset): Promise<ResetCancellationContext> {
  const { data, error } = await (supabase as any).rpc('admin_exam_reset_cancel_context', {
    p_apprenant_id: row.apprenant_id, p_reset_id: row.reset_id,
  });
  if (error) throw error;
  const context = data as ResetCancellationContext;
  if (!context || !exactCancellationContext(row, context)) throw new Error('Identité de la remise à zéro non concordante.');
  return context;
}