import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RefaireMatiereButton } from './RefaireMatiereButton';
import { useLiveExamens } from './useLiveExamens';
import type { SubjectRetakeReceipt } from '@/lib/examSubjectRetake';
export function AuthorizedSubjectRetakes({account,owner,onStarted}:{account:string;owner:string;onStarted:(r:SubjectRetakeReceipt)=>void}) {
 const {examens}=useLiveExamens();
 const {data,error}=useQuery({queryKey:['authorized-subject-retakes',account],enabled:Boolean(account&&owner),retry:false,
  queryFn:async()=>{
   const [grants,receipts]=await Promise.all([
    supabase.from('exam_subject_reset_authorizations' as never).select('*').eq('apprenant_id',account),
    supabase.from('exam_subject_retakes' as never).select('authorization_id').eq('apprenant_id',account),
   ]);
   if(grants.error||receipts.error)throw grants.error||receipts.error;
   const used=new Set((receipts.data as unknown as {authorization_id:string}[]??[]).map(r=>r.authorization_id));
   return (grants.data as unknown as {operation_id:string;exam_id:string;matiere_id:string;source_exercice_id:string;source_attempt_id:string|null}[]??[]).filter(g=>!used.has(g.operation_id));
  }});
 if(error)return <p role="alert" className="text-sm text-destructive">Repassages autorisés momentanément illisibles. Aucun passage remplacé.</p>;
 if(!data?.length)return null;
 return <section className="space-y-3 mb-4" aria-label="Matières autorisées à refaire">{data.map(g=><div key={g.operation_id} className="flex flex-wrap gap-3 items-center justify-between border-b py-3">
  <span>{examens.find(e=>e.id===g.exam_id)?.titre ?? g.exam_id} · {examens.find(e=>e.id===g.exam_id)?.matieres.find(m=>m.id===g.matiere_id)?.nom ?? g.matiere_id} — À refaire, non notée</span>
  <RefaireMatiereButton owner={owner} account={account} exam={g.exam_id} subject={g.matiere_id} sourceExercise={g.source_exercice_id} sourceAttempt={g.source_attempt_id} onStarted={onStarted}/>
 </div>)}</section>;
}
