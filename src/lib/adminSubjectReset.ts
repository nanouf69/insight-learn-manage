import { supabase } from '@/integrations/supabase/client';
export interface SubjectResetContext {
 apprenant_id: string; exam_id: string; matiere_id: string; filiere: string;
 learner_name: string; subject_name: string; status: 'non_commencee'|'en_cours'|'en_attente'|'notee'|'ambigu';
 reason: string|null; source_exercice_id: string; source_attempt_id: string|null; source_result_id: string|null;
 source_token: string; version_token: string; authorization_id: string|null;
}
export async function readSubjectResetContext(account: string, exam: string, subject: string): Promise<SubjectResetContext> {
 const {data,error}=await supabase.rpc('exam_subject_reset_context' as never,{
  p_apprenant_id:account,p_exam_id:exam,p_matiere_id:subject,
 } as never);
 if(error) throw new Error(error.message);
 const c=data as unknown as SubjectResetContext;
 if(!c || c.apprenant_id!==account || c.exam_id!==exam || c.matiere_id!==subject || !c.source_token || !c.version_token) throw new Error('Identité serveur non confirmée.');
 return c;
}
export async function authorizeSubjectReset(c: SubjectResetContext, operation: string) {
 const {data,error}=await supabase.rpc('admin_authorize_exam_subject_reset' as never,{
  p_operation_id:operation,p_apprenant_id:c.apprenant_id,p_exam_id:c.exam_id,p_filiere:c.filiere,
  p_matiere_id:c.matiere_id,p_learner_name:c.learner_name,p_source_token:c.source_token,p_version_token:c.version_token,
 } as never);
 if(error) throw new Error(error.message);
 const r=data as unknown as {operation_id:string;apprenant_id:string;exam_id:string;matiere_id:string;source_token:string;version_token:string};
 if(!r || r.apprenant_id!==c.apprenant_id || r.exam_id!==c.exam_id || r.matiere_id!==c.matiere_id || r.source_token!==c.source_token || r.version_token!==c.version_token) throw new Error('Autorisation non confirmée.');
 const current=await readSubjectResetContext(c.apprenant_id,c.exam_id,c.matiere_id);
 if(current.authorization_id!==r.operation_id) throw new Error('Autorisation non retrouvée après envoi. Relisez avant de réessayer.');
 return current;
}
