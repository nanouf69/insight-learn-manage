import { supabase } from '@/integrations/supabase/client';
export interface ExamAccess { exam_id: string; opened: boolean | null; operation_id: string | null; changed_at: string | null }
export interface SessionAccess { session_id: string; session_name: string; exams: ExamAccess[] }
export const ACCESS_NOT_INSTALLED = 'Contrôle des examens blancs préparé, mais non installé sur le serveur. Aucun accès n’a été modifié.';
export function accessError(e: {code?: string; message?: string}): Error {
 return new Error(e.code==='PGRST202' || /could not find the function/i.test(e.message??'') ? ACCESS_NOT_INSTALLED : e.message??'Lecture des accès impossible.');
}
export async function readSessionAccess(id:string):Promise<SessionAccess> {
 const {data,error}=await supabase.rpc('admin_session_exam_access_context' as never,{p_session_id:id} as never);
 if(error)throw accessError(error);
 const c=data as unknown as SessionAccess;
 if(!c || c.session_id!==id || !Array.isArray(c.exams))throw new Error('La session reçue ne correspond pas à la session affichée.');
 return c;
}
export async function setSessionAccess(c:SessionAccess,e:ExamAccess,opened:boolean,op:string):Promise<SessionAccess> {
 const {data,error}=await supabase.rpc('admin_set_session_exam_access' as never,{
  p_operation_id:op,p_session_id:c.session_id,p_exam_id:e.exam_id,p_opened:opened,
  p_expected_operation_id:e.operation_id,p_session_name:c.session_name,
 } as never);
 if(error)throw accessError(error);
 const receipt=data as unknown as {operation_id:string;session_id:string;exam_id:string;opened:boolean};
 if(!receipt || receipt.operation_id!==op || receipt.session_id!==c.session_id || receipt.exam_id!==e.exam_id || receipt.opened!==opened)
  throw new Error('La confirmation reçue ne correspond pas à cette session et cet examen.');
 const current=await readSessionAccess(c.session_id);
 if(!current.exams.some(x=>x.exam_id===e.exam_id && x.operation_id===op && x.opened===opened))
  throw new Error('Confirmation non retrouvée après envoi. Relisez les accès avant de réessayer.');
 return current;
}