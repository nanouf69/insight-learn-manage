import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { requirements, missingAnswers, validAnswer, legacyAnswers } from '@/lib/quizQrcTaxi/manifest';
import { validateAttempt, journalKey } from '@/lib/quizQrcTaxi/durable';
import { useDurablePractice } from '@/lib/quizQrcTaxi/useDurablePractice';
const state = vi.hoisted(() => ({ user: 'a', revision: 0, answers: {} as Record<string, unknown>, fail: false, calls: [] as string[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
 auth: { getSession: async () => ({ data: { session: { user: { id: state.user } } } }) },
 rpc: async (name: string, args: Record<string, unknown>) => {
  state.calls.push(name);
  if (state.fail) return { error: { message: 'network' } };
  if (name === 'qrc_practice_save') { state.revision++; state.answers[String(args.p_key)] = args.p_answer; }
  return { data: { id: 'attempt', owner: state.user, quiz: 'complet', version: 'taxi-optional-durable-v1', revision: state.revision, manifest: requirements('complet'), answers: { ...state.answers }, answer_meta: {}, submitted_at: null, saved_at: null, submit_operation: null } };
 }
} }));
beforeEach(() => { localStorage.clear(); state.user='a'; state.revision=0; state.answers={}; state.fail=false; state.calls=[]; });
describe('durable optional quizzes', () => {
 it('all 78/84 obligations required, whitespace and empty selections rejected', () => {
  expect(requirements('complet')).toHaveLength(78); expect(requirements('specialites')).toHaveLength(84);
  expect(missingAnswers(requirements('complet'), {})).toHaveLength(78);
  expect(validAnswer({key:'q',label:'q',kind:'text'},' \n ')).toBe(false);
  expect(validAnswer({key:'q',label:'q',kind:'choices',options:['A']},[])).toBe(false);
 });
 it('commune full-list presence needs 58 / 24 entries, correctness not required', () => {
  const r=requirements('complet').find(r=>r.key==='list:metropole'); if (!r) throw Error('rule');
  expect(validAnswer(r,'Bron')).toBe(false);
  expect(validAnswer(r,Array.from({length:58},(_,i)=>`élément ${i}`).join('\n'))).toBe(true);
  expect(requirements('specialites').find(r=>r.key==='list:zupc')?.min).toBe(24);
 });
 it('legacy state never implies submission; unknown answers reported', () => {
  const result=legacyAnswers({termine:true,reponses:{2:{qrc:'réponse'},999:{qcm:'inconnu'}}},requirements('complet'));
  expect(result.answers['qrc:2']).toBe('réponse'); expect(result.rejected).toContain('mcq:999');
  expect(missingAnswers(requirements('complet'),result.answers).length).toBe(77);
 });
 it('wrong account and fake submitted proof rejected', () => {
  expect(()=>validateAttempt({owner:'b'},'a','complet')).toThrow();
  expect(()=>validateAttempt({id:'x',owner:'a',quiz:'complet',version:'taxi-optional-durable-v1',revision:1,manifest:requirements('complet'),answers:{},submitted_at:'now',submit_operation:'x'},'a','complet')).toThrow('preuve');
 });
 it('offline answer stays in scoped journal and reconnect saves without zero', async () => {
  const {result}=renderHook(()=>useDurablePractice('a','complet'));
  await waitFor(()=>expect(result.current.attempt?.id).toBe('attempt'));
  state.fail=true;
  act(()=>result.current.edit('qrc:2','texte conservé'));
  await act(async()=>{await result.current.synchronize();});
  expect(result.current.answers['qrc:2']).toBe('texte conservé');
  expect(localStorage.getItem(journalKey('a','complet'))).toContain('texte conservé');
  expect(state.answers['qrc:2']).toBeUndefined();
  state.fail=false;
  await act(async()=>{await result.current.synchronize();});
  expect(state.answers['qrc:2']).toBe('texte conservé'); expect(result.current.pending).toHaveLength(0);
 });
 it('incomplete attempt cannot invoke submit', async () => {
  const {result}=renderHook(()=>useDurablePractice('a','complet'));
  await waitFor(()=>expect(result.current.attempt).toBeTruthy());
  await act(async()=>{await Promise.all([result.current.submit(),result.current.submit()]);});
  expect(state.calls.filter(n=>n==='qrc_practice_submit')).toHaveLength(0);
 });
});