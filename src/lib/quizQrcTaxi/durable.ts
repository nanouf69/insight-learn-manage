import { supabase } from '@/integrations/supabase/client';
import { AnswerValue, PracticeQuiz, PRACTICE_VERSION, Requirement, validAnswer } from './manifest';
export interface PracticeAttempt {
  id: string; owner: string; quiz: PracticeQuiz; version: string; revision: number; manifest: Requirement[];
  answers: Record<string, AnswerValue>; answer_meta: Record<string, { saved_at: string; revision: number }>;
  saved_at: string | null; submitted_at: string | null; submit_operation: string | null; missing?: Requirement[];
}
export interface PendingAnswer { key: string; answer: AnswerValue; base: AnswerValue | undefined; operation: string }
export interface LocalJournal { attempt?: string; opening: string; pending: PendingAnswer[]; submit?: { operation: string; revision: number } }
export const journalKey = (account: string, quiz: PracticeQuiz) => `qrc-practice:pending:v1:${account}:${quiz}`;
export function loadJournal(account: string, quiz: PracticeQuiz): LocalJournal {
  try { const value = localStorage.getItem(journalKey(account, quiz)); if (value) return JSON.parse(value); } catch { /* unreadable copy is never removed */ }
  return { opening: crypto.randomUUID(), pending: [] };
}
export function persistJournal(account: string, quiz: PracticeQuiz, journal: LocalJournal) {
  localStorage.setItem(journalKey(account, quiz), JSON.stringify(journal));
}
export function validateAttempt(value: unknown, account: string, quiz: PracticeQuiz): PracticeAttempt {
  if (!value || typeof value !== 'object') throw new Error('Lecture de sauvegarde invalide.');
  const a = value as PracticeAttempt;
  if (a.owner !== account || a.quiz !== quiz || a.version !== PRACTICE_VERSION || typeof a.id !== 'string' || !Number.isInteger(a.revision) || !Array.isArray(a.manifest) || !a.manifest.length || !a.answers || typeof a.answers !== 'object') throw new Error('Sauvegarde non rattachée à ce compte et ce quiz.');
  if (a.submitted_at && (typeof a.submit_operation !== 'string' || a.manifest.some(r => !validAnswer(r, a.answers[r.key])))) throw new Error('Soumission sans preuve complète.');
  return a;
}
async function command(account: string, quiz: PracticeQuiz, name: string, args: Record<string, unknown>) {
  const before = await supabase.auth.getSession();
  if (before.error || before.data.session?.user.id !== account) throw new Error('Reconnectez-vous avec le même compte.');
  // Narrow dynamic RPC boundary: schema is regenerated when migration is applied.
  const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
  const { data, error } = await rpc(name, args);
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  const after = await supabase.auth.getSession();
  if (after.error || after.data.session?.user.id !== account) throw new Error('Le compte a changé ; réponse non appliquée.');
  return validateAttempt(data, account, quiz);
}
export const openPractice = (account: string, quiz: PracticeQuiz, operation: string, fresh = false) => command(account, quiz, 'qrc_practice_open', { p_quiz: quiz, p_operation: operation, p_new: fresh });
export const readPractice = (account: string, quiz: PracticeQuiz, attempt: string) => command(account, quiz, 'qrc_practice_read', { p_attempt: attempt });
export const savePractice = (account: string, quiz: PracticeQuiz, attempt: string, revision: number, entry: PendingAnswer) => command(account, quiz, 'qrc_practice_save', { p_attempt: attempt, p_expected: revision, p_key: entry.key, p_answer: entry.answer, p_operation: entry.operation });
export const submitPractice = (account: string, quiz: PracticeQuiz, attempt: string, revision: number, operation: string) => command(account, quiz, 'qrc_practice_submit', { p_attempt: attempt, p_expected: revision, p_operation: operation });
export const sameAnswer = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);