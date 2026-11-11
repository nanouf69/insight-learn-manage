import { describe, expect, it, vi } from 'vitest';
const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
import { readSubjectResetContext, SUBJECT_RESET_UNAVAILABLE, subjectResetError } from '@/lib/adminSubjectReset';
describe('subject reset server function missing', () => {
  it('PGRST202 schema-cache error becomes an explicit no-action refusal', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.exam_subject_reset_context(p_apprenant_id, p_exam_id, p_matiere_id) in the schema cache' } });
    await expect(readSubjectResetContext('a', 'EB3', 't3p')).rejects.toThrow(SUBJECT_RESET_UNAVAILABLE);
  });
  it('other server refusals keep their own message', () => {
    expect(subjectResetError({ code: 'P0478', message: 'Une copie est en cours ; reprenez-la sans la remplacer.' }).message).toBe('Une copie est en cours ; reprenez-la sans la remplacer.');
  });
});
