import { supabase } from '@/integrations/supabase/client';
import { fetchCoreMatiereStatesBulk } from '@/lib/coreExamPublication';
import { loadSavedExamens } from '@/components/cours-en-ligne/ExamensBlancsEditor';
import { observerCoherenceEB, type RapportCoherenceEB } from './coherenceEB';

/** Deterministic sequential keyset pages. A failed or non-advancing page never yields a report. */
export async function lireCurseurCoherence<T extends Record<string,any>>(read:(cursor:string|null)=>PromiseLike<{data:T[]|null;error:unknown}>,pk:string,signal?:AbortSignal):Promise<T[]> {
  const rows:T[]=[];let cursor:string|null=null;const seen=new Set<string>();
  for(;;){
    if(signal?.aborted)throw new Error('Vérification annulée');
    const res=await read(cursor);if(res.error||res.data===null)throw new Error('Lecture complète des copies impossible');
    for(const row of res.data){const id=String(row[pk]??'');if(!id||seen.has(id)||cursor&&id<=cursor)throw new Error('Pagination des copies incohérente');seen.add(id);rows.push(row);}
    if(res.data.length<100)return rows;
    const next=String(res.data.at(-1)?.[pk]??'');if(!next||next===cursor)throw new Error('Pagination arrêtée');cursor=next;
  }
}

/** Admin-only surface; every operation is a SELECT/read role check. No mutation RPC. */
export async function lireCoherenceEB(signal?:AbortSignal):Promise<RapportCoherenceEB>{
  const {data:auth,error}=await supabase.auth.getUser();if(error||!auth.user)throw new Error('Session administrateur requise');
  const role=await supabase.rpc('has_role',{_user_id:auth.user.id,_role:'admin'});if(role.error||role.data!==true)throw new Error('Accès administrateur requis');
  const read=async(table:string,cols:string,pk:string,scope?:(q:any)=>any)=>lireCurseurCoherence<any>(cursor=>{
    let q:any=supabase.from(table as any).select(cols).order(pk).limit(100);if(scope)q=scope(q);if(cursor)q=q.gt(pk,cursor);return q;
  },pk,signal);
  const examIds=Array.from({length:6},(_,i)=>[`EB${i+1}`,`EB${i+1}-TAXI`]).flat();
  // Include accounts with native-only or legacy-only copies, not only current enrollment rosters.
  const attempts=await read('exam_attempts_v2','attempt_id,apprenant_id','attempt_id',q=>q.in('exam_id',examIds));
  const receipts=await read('apprenant_quiz_results','id,apprenant_id','id',q=>q.in('quiz_id',examIds));
  const ids=[...new Set([...attempts,...receipts].map(a=>String(a.apprenant_id)))];
  const tests=await read('comptes_test_techniques','apprenant_id','apprenant_id');const testIds=new Set(tests.map(t=>t.apprenant_id));
  const definitions=(await loadSavedExamens(false,undefined,true)).filter(d=>examIds.includes(d.id));
  if(definitions.length!==12)throw new Error('Les douze examens ne sont pas tous lisibles');
  const alertes:RapportCoherenceEB['alertes']=[];let copies=0,candidats=0;
  for(let i=0;i<ids.length;i+=10){
    if(signal?.aborted)throw new Error('Vérification annulée');
    const lot=ids.slice(i,i+10).filter(id=>!testIds.has(id));if(!lot.length)continue;
    const profiles=await read('apprenants','id,nom,prenom','id',q=>q.in('id',lot));
    if(profiles.length!==lot.length)throw new Error('Identité de candidat non lisible');
    const core=await fetchCoreMatiereStatesBulk(lot);if(core===null)throw new Error('Lecture des publications incomplète');
    const rows=await read('apprenant_quiz_results','id,apprenant_id,quiz_id,matiere_id,completed_at,details','id',q=>q.in('apprenant_id',lot).in('quiz_id',examIds));
    const resets=await read('core_exam_resets','reset_id,apprenant_id,exam_id,cutoff_at,archived_legacy_result_ids','reset_id',q=>q.in('apprenant_id',lot));
    const drafts=await read('reponses_apprenants','id,apprenant_id,exercice_id,completed,reponses,updated_at,created_at','id',q=>q.in('apprenant_id',lot).like('exercice_id','EB%'));
    for(const p of profiles){
      const rs=resets.filter(r=>r.apprenant_id===p.id);const archived=new Set(rs.flatMap(r=>r.archived_legacy_result_ids??[]));
      const states=(core.get(p.id)??[]).filter(s=>!s.isTest&&examIds.includes(s.examId)&&!rs.some(r=>r.exam_id===s.examId&&Date.parse(s.finishedAt)<=Date.parse(r.cutoff_at)));
      const ownRows=rows.filter(r=>r.apprenant_id===p.id&&!archived.has(r.id)&&!rs.some(z=>z.exam_id===r.quiz_id&&Date.parse(r.completed_at)<=Date.parse(z.cutoff_at)));
      copies+=states.length;candidats++;
      alertes.push(...observerCoherenceEB({owner:p.id,nom:`${p.nom} ${p.prenom}`,rows:ownRows,states,drafts:drafts.filter(d=>d.apprenant_id===p.id),definitions,rejected:new Set()}));
    }
  }
  if(signal?.aborted)throw new Error('Vérification annulée');
  const sorted=alertes.sort((a,b)=>a.cle.localeCompare(b.cle));
  return {controle:new Date().toISOString(),candidats,copies,alertes:sorted,signature:JSON.stringify(sorted.map(a=>[a.cle,a.date,a.note]))};
}