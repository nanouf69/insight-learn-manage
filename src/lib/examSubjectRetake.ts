import { supabase } from '@/integrations/supabase/client';
import { freshSessionCall } from '@/lib/sessionRpc';
import { operationId } from '@/features/noyau-passage/pontV2';
import type { Matiere } from '@/components/cours-en-ligne/examens-blancs-data';

export interface SubjectRetakeReceipt {
  operation_id: string;
  apprenant_id: string;
  exam_id: string;
  matiere_id: string;
  source_exercice_id: string;
  source_attempt_id: string | null;
  attempt_id: string | null;
  exercice_id: string;
  tentative: number;
  moteur: 'v2' | 'ancien';
  matiere: Matiere;
}

export function validateSubjectRetakeReceipt(value: unknown, account: string, exam: string, subject: string): SubjectRetakeReceipt {
  const r = value as SubjectRetakeReceipt | null;
  if (!r || r.apprenant_id !== account || r.exam_id !== exam || r.matiere_id !== subject
    || !Number.isInteger(r.tentative) || r.tentative < 2 || r.matiere?.id !== subject
    || r.exercice_id !== `${exam}__${subject}__t${r.tentative}`
    || !['ancien', 'v2'].includes(r.moteur) || (r.moteur === 'v2' && !r.attempt_id)) {
    throw new Error('La reprise reçue ne correspond pas à ce compte et à cette matière. Aucun transfert effectué.');
  }
  return r;
}

export const subjectRetakeStorageKey = (owner: string, account: string) => `subject_retake_${owner}_${account}`;

export async function startSubjectRetake(p: {
  owner: string; account: string; exam: string; subject: string; sourceExercise: string; sourceAttempt?: string | null;
}): Promise<SubjectRetakeReceipt> {
  const op = await operationId(`subject-retake:${p.owner}:${p.account}:${p.exam}:${p.subject}:${p.sourceExercise}:${p.sourceAttempt ?? 'legacy'}`);
  const { data, error } = await freshSessionCall(() => supabase.rpc('start_exam_subject_retake' as never, {
    p_operation_id: op, p_apprenant_id: p.account, p_exam_id: p.exam, p_matiere_id: p.subject,
    p_source_exercice_id: p.sourceExercise, p_source_attempt_id: p.sourceAttempt ?? null,
  } as never), p.owner);
  if (error) throw new Error(error.message);
  return validateSubjectRetakeReceipt(data, p.account, p.exam, p.subject);
}