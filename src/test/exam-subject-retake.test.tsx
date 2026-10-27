import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), session: vi.fn(async (call: () => unknown) => call()) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/lib/sessionRpc', () => ({ freshSessionCall: mocks.session }));
vi.mock('@/features/noyau-passage/pontV2', () => ({ operationId: async (value: string) => value }));
import { startSubjectRetake, subjectRetakeStorageKey, validateSubjectRetakeReceipt } from '@/lib/examSubjectRetake';
import { RefaireMatiereButton } from '@/components/cours-en-ligne/RefaireMatiereButton';
import { rememberRetakeReturn, readRetakeReturn } from '@/lib/subjectRetakeNavigation';
import { historicalResultCopy } from '@/components/cours-en-ligne/SubjectCopyHistory';
const receipt = { operation_id: 'op', apprenant_id: 'learner', exam_id: 'EB1', matiere_id: 'gestion',
  source_exercice_id: 'EB1__gestion', source_attempt_id: null, attempt_id: null, exercice_id: 'EB1__gestion__t2',
  tentative: 2, moteur: 'ancien', matiere: { id: 'gestion', questions: [{ id: 1 }] } };
const args = { owner: 'owner', account: 'learner', exam: 'EB1', subject: 'gestion', sourceExercise: 'EB1__gestion' };
beforeEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear(); localStorage.clear(); });
describe('Subject-only retake receipts and button', () => {
  it('reload keeps original multi-subject filter and never overwrites return navigation with the new passage', () => {
    const original = {examId:'EB1',phase:'transition' as const,index:1,filter:['gestion','anglais'],resultIds:['old'],exerciseIds:{gestion:'EB1__gestion'},tentative:1};
    rememberRetakeReturn(sessionStorage,'owner','learner',original);
    rememberRetakeReturn(sessionStorage,'owner','learner',{...original,filter:['gestion'],tentative:2});
    expect(readRetakeReturn(sessionStorage,'owner','learner')).toEqual(original);
    expect(readRetakeReturn(sessionStorage,'owner','other')).toBeNull();
  });
  it('history uses result ID and frozen questions, never replaces missing historical content with current content', () => {
    const a=historicalResultCopy({id:'old',matiere_id:'gestion',details:{reponses:{1:'old'},snapshot:{questions:[{id:1,enonce:'old text'}]}}});
    const b=historicalResultCopy({id:'new',matiere_id:'gestion',details:{reponses:{1:'new'}}});
    expect(a.id).not.toBe(b.id);expect(a.questions[0].enonce).toBe('old text');expect(b.questions).toEqual([]);
    expect(a.answers[1]).toBe('old');
  });
  it('rejects another account or subject receipt', () => {
    expect(() => validateSubjectRetakeReceipt(receipt, 'other', 'EB1', 'gestion')).toThrow();
    expect(() => validateSubjectRetakeReceipt(receipt, 'learner', 'EB1', 'anglais')).toThrow();
  });
  it('rejects malformed new identity and empty official questions', () => {
    expect(() => validateSubjectRetakeReceipt({ ...receipt, exercice_id: 'EB1__gestion' }, 'learner', 'EB1', 'gestion')).toThrow();
    expect(() => validateSubjectRetakeReceipt({ ...receipt, matiere: { id: 'gestion', questions: [] } }, 'learner', 'EB1', 'gestion')).toThrow();
  });
  it('rejects a different source and never accepts client authorization', async () => {
    mocks.rpc.mockResolvedValue({ data: { ...receipt, source_exercice_id: 'EB1__gestion__t5' }, error: null });
    await expect(startSubjectRetake(args)).rejects.toThrow('source');
    expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty('autorise');
  });
  it('isolates account navigation and preserves all existing queues byte-for-byte', async () => {
    expect(subjectRetakeStorageKey('owner', 'learner')).not.toEqual(subjectRetakeStorageKey('owner', 'other'));
    localStorage.setItem('answer_save_queue_v1', '[{"exercice_id":"EB1__gestion","reponses":{"1":"draft"}}]');
    localStorage.setItem('noyau_v2_answer_queue_parked_v1', '[{"attempt":"old"}]');
    const before = JSON.stringify(localStorage);
    mocks.rpc.mockResolvedValue({ data: receipt, error: null });
    expect((await startSubjectRetake(args)).tentative).toBe(2);
    expect(JSON.stringify(localStorage)).toEqual(before);
  });
  it('double click waits for one server acknowledgment before navigation', async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.rpc.mockReturnValue(new Promise(r => { resolve = r; }));
    const onStarted = vi.fn(); render(<RefaireMatiereButton {...args} onStarted={onStarted} />);
    const button = screen.getByRole('button', { name: 'Refaire la matière' });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1)); expect(onStarted).not.toHaveBeenCalled();
    resolve({ data: receipt, error: null });
    await waitFor(() => expect(onStarted).toHaveBeenCalledTimes(1));
  });
  it('server refusal keeps the old passage and shows administration message', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Demandez une autorisation à l’administration (48 heures).' } });
    const onStarted = vi.fn(); render(<RefaireMatiereButton {...args} onStarted={onStarted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Refaire la matière' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('administration'));
    expect(onStarted).not.toHaveBeenCalled();
  });
});