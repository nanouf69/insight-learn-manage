import { readSubjectResetContext } from '@/lib/adminSubjectReset';
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
  if (!r || !r.operation_id || r.apprenant_id !== account || r.exam_id !== exam || r.matiere_id !== subject
    || !Number.isInteger(r.tentative) || r.tentative < 1 || r.matiere?.id !== subject
    || r.exercice_id !== `${exam}__${subject}${r.tentative === 1 ? '' : `__t${r.tentative}`}`
    || !Array.isArray(r.matiere.questions) || r.matiere.questions.length === 0
    || !['ancien', 'v2'].includes(r.moteur) || (r.moteur === 'v2' && !r.attempt_id)) {
    throw new Error('La reprise reçue ne correspond pas à ce compte et à cette matière. Aucun transfert effectué.');
  }
  return r;
}

export const subjectRetakeStorageKey = (owner: string, account: string) => `subject_retake_${owner}_${account}`;

export async function startSubjectRetake(p: {
  owner: string; account: string; exam: string; subject: string; sourceExercise: string; sourceAttempt?: string | null;
}): Promise<SubjectRetakeReceipt> {
  const current = await readSubjectResetContext(p.account,p.exam,p.subject);
  if (current.status === 'en_cours') {
    const {data,error}=await supabase.from('exam_subject_retakes' as never).select('*')
      .eq('apprenant_id',p.account).eq('exam_id',p.exam).eq('matiere_id',p.subject).eq('exercice_id',current.source_exercice_id).maybeSingle();
    if(error)throw new Error(error.message);
    if(data)return validateSubjectRetakeReceipt(data,p.account,p.exam,p.subject);
    throw new Error(current.reason ?? 'Reprenez la copie existante.');
  }
  if(current.status==='ambigu')throw new Error(current.reason ?? 'Identité non prouvée.');
  // The displayed result may belong to an earlier attempt. Server identity wins, never a guessed suffix.
  p = {...p,sourceExercise:current.source_exercice_id,sourceAttempt:current.source_attempt_id};
  const op = await operationId(`subject-retake:${p.owner}:${p.account}:${p.exam}:${p.subject}:${p.sourceExercise}:${p.sourceAttempt ?? 'legacy'}:${current.source_token}:${current.authorization_id ?? 'normal'}`);
  const { data, error } = await freshSessionCall(() => supabase.rpc('start_exam_subject_retake' as never, {
    p_operation_id: op, p_apprenant_id: p.account, p_exam_id: p.exam, p_matiere_id: p.subject,
    p_source_exercice_id: p.sourceExercise, p_source_attempt_id: p.sourceAttempt ?? null,
  } as never), p.owner);
  if (error) throw new Error(error.message);
  const receipt = validateSubjectRetakeReceipt(data, p.account, p.exam, p.subject);
  if (receipt.source_exercice_id !== p.sourceExercise
    || receipt.source_attempt_id !== (p.sourceAttempt ?? null)) {
    throw new Error('Le passage source ne correspond pas au reçu serveur. Aucun brouillon transféré.');
  }
  return receipt;
}