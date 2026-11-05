import { supabase } from '@/integrations/supabase/client';
import { freshSessionRead } from './sessionRpc';
import { activeLearners, computeFirstPassage, type QuestionStatsTarget, type SourceStats, type AttemptStats, type CompletionStats, type InscriptionStats, type SessionStats, type FirstAnswerEvent } from './premierPassageStats';

async function pages<T>(query: (start:number,end:number)=>PromiseLike<{data:unknown;error:unknown}>) {
  const rows:T[]=[];
  for(let start=0;start<20000;start+=500){
    const {data,error}=await freshSessionRead(()=>query(start,start+499));
    if(error)throw error;
    if(!Array.isArray(data))throw new Error('Lecture des statistiques incomplète');
    rows.push(...data as T[]);if(data.length<500)return rows;
  }
  throw new Error('Volume trop important : taux non calculé');
}
export async function readFirstPassage(module:number,exercise:number,questions:QuestionStatsTarget[]) {
  // Existing server role check; no privileged data is fetched for a learner.
  const {data:session}=await supabase.auth.getSession();const user=session.session?.user.id;
  if(!user)throw new Error('Session administrateur requise');
  const role=await freshSessionRead(()=>supabase.rpc('has_role',{_user_id:user,_role:'admin'}));
  if(role.error || role.data!==true)throw new Error('Accès administrateur requis');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const sessions=await pages<SessionStats>((a,b)=>supabase.from('sessions').select('id,nom,date_debut,date_fin,statut,heure_debut,creneaux').lte('date_debut',today).gte('date_fin',today).order('id').range(a,b));
  if(!sessions.length)return computeFirstPassage(questions,[],new Map(),[],[]);
  const enrollments=await pages<InscriptionStats>((a,b)=>supabase.from('session_apprenants').select('apprenant_id,session_id,date_debut,date_fin,date_fin_personnalisee,liste_attente').in('session_id',sessions.map(s=>s.id)).order('id').range(a,b));
  const tests=await pages<{apprenant_id:string}>((a,b)=>supabase.from('comptes_test_techniques').select('apprenant_id').order('apprenant_id').range(a,b));
  const learners=activeLearners(sessions,enrollments,today,new Set(tests.map(t=>t.apprenant_id)));
  const sources:SourceStats[]=[{module,exercise}];
  const binding=await freshSessionRead(()=>supabase.from('quiz_question_bindings').select('quiz_id,section_id').eq('module_id',module).eq('exercise_id',exercise));
  if(binding.error)throw binding.error;
  if((binding.data?.length ?? 0)>1)throw new Error('Identité du quiz partagé ambiguë');
  const identity=binding.data?.[0];
  if(identity){
    const siblings=await pages<{module_id:number;exercise_id:number}>((a,b)=>supabase.from('quiz_question_bindings').select('module_id,exercise_id').eq('quiz_id',identity.quiz_id).eq('section_id',identity.section_id).order('id').range(a,b));
    for(const s of siblings)if(!sources.some(x=>x.module===s.module_id && x.exercise===s.exercise_id))sources.push({module:s.module_id,exercise:s.exercise_id});
  }
  if(!learners.size)return computeFirstPassage(questions,sources,learners,[],[]);
  const attempts:AttemptStats[]=[],completions:CompletionStats[]=[],events:FirstAnswerEvent[]=[];
  // Bounded batches, SELECT only, one read per opened exercise, never per question.
  const ids=[...learners.keys()];
  for(let offset=0;offset<ids.length;offset+=75){
    const batch=ids.slice(offset,offset+75);const exerciseIds=sources.map(s=>`module_${s.module}_exo_${s.exercise}`);
    for(const table of ['reponses_apprenants','reponses_apprenants_historique'] as const){
      attempts.push(...await pages<AttemptStats>((a,b)=>supabase.from(table).select('apprenant_id,exercice_id,tentative,status,submitted_at,reponses').in('apprenant_id',batch).in('exercice_id',exerciseIds).order('id').range(a,b)));
    }
    completions.push(...await pages<CompletionStats>((a,b)=>supabase.from('apprenant_module_completion').select('apprenant_id,module_id,status,completed_at,details').in('apprenant_id',batch).in('module_id',[...new Set(sources.map(s=>s.module))]).order('id').range(a,b)));
    events.push(...await pages<FirstAnswerEvent>((a,b)=>supabase.from('reponses_apprenants_journal').select('apprenant_id,exercice_id,question_id,tentative,valeur,created_at').in('apprenant_id',batch).in('exercice_id',exerciseIds).eq('tentative',1).order('created_at').order('id').range(a,b)));
  }
  const {data:finalSession}=await supabase.auth.getSession();
  if(finalSession.session?.user.id!==user)throw new Error('Le compte connecté a changé');
  return computeFirstPassage(questions,sources,learners,attempts,completions,events);
}