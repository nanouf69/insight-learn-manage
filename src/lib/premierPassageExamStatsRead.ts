import { supabase } from '@/integrations/supabase/client';
import { freshSessionRead } from './sessionRpc';
import { activeLearners, activeSessions, type SessionStats, type InscriptionStats, type QuestionStatsTarget, type AttemptStats, type FirstAnswerEvent } from './premierPassageStats';
import { firstPassageExamIds, computeExamSessionFirstPassage, type ExamStatsAttempt, type ExamStatsEvent, type ExamStatsResult, type ExamStatsRetake, type ExamStatsEvidence, type ExamStatsState, type ExamStatsQrc, type ExamStatsQrcIa } from './premierPassageExamStats';

async function pages<T>(query:(a:number,b:number)=>PromiseLike<{data:unknown;error:unknown}>):Promise<T[]> {
  const rows:T[]=[];
  for(let a=0;a<20000;a+=500){const {data,error}=await freshSessionRead(()=>query(a,a+499));if(error)throw error;if(!Array.isArray(data))throw new Error('Lecture incomplète');rows.push(...data as T[]);if(data.length<500)return rows;}
  throw new Error('Volume de preuves trop important');
}
export async function readExamFirstPassage(examId:string,subject:string,questions:QuestionStatsTarget[]) {
  const {data:session}=await supabase.auth.getSession();const user=session.session?.user.id;
  if(!user)throw new Error('Session administrateur requise');
  const role=await freshSessionRead(()=>supabase.rpc('has_role',{_user_id:user,_role:'admin'}));
  if(role.error || role.data!==true)throw new Error('Accès administrateur requis');
  const examIds=firstPassageExamIds(examId);
  if(!examIds.length)throw new Error('Examen hors périmètre');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const sessions=activeSessions(await pages<SessionStats>((a,b)=>supabase.from('sessions').select('id,nom,date_debut,date_fin,statut,heure_debut,creneaux').lte('date_debut',today).gte('date_fin',today).order('id').range(a,b)),today);
  const evidence:ExamStatsEvidence={attempts:[],events:[],states:[],legacy:[],journal:[],results:[],retakes:[],accounts:[],qrc:[],qrcIa:[]};
  if(!sessions.length)return computeExamSessionFirstPassage(questions,examIds,subject,[],[],today,new Set(),evidence);
  const [enrollments,tests]=await Promise.all([
    pages<InscriptionStats>((a,b)=>supabase.from('session_apprenants').select('apprenant_id,session_id,date_debut,date_fin,date_fin_personnalisee,liste_attente').in('session_id',sessions.map(s=>s.id)).order('id').range(a,b)),
    pages<{apprenant_id:string}>((a,b)=>supabase.from('comptes_test_techniques').select('apprenant_id').order('apprenant_id').range(a,b)),
  ]);
  const excluded=new Set(tests.map(t=>t.apprenant_id));const ids=[...activeLearners(sessions,enrollments,today,excluded).keys()];
  for(let offset=0;offset<ids.length;offset+=50){
    const batch=ids.slice(offset,offset+50);
    const [attempts,events,states,legacy,archived,journal,results,retakes,accounts,qrc]=await Promise.all([
      pages<ExamStatsAttempt>((a,b)=>supabase.from('exam_attempts_v2').select('attempt_id,apprenant_id,exam_id,started_at,is_test,snapshot').in('apprenant_id',batch).in('exam_id',examIds).order('attempt_id').range(a,b)),
      pages<ExamStatsEvent>((a,b)=>supabase.from('answer_events').select('event_id,attempt_id,apprenant_id,question_id,valeur_nouvelle,valeur_precedente,revision_precedente,revision_nouvelle,auteur,created_at').in('apprenant_id',batch).in('question_id',questions.map(q=>`${subject}:${q.id}`)).order('event_id').range(a,b)),
      pages<ExamStatsState>((a,b)=>supabase.from('answer_state').select('attempt_id,apprenant_id,question_id,valeur').in('apprenant_id',batch).in('question_id',questions.flatMap(q=>[`${subject}:${q.id}`,String(q.id)])).order('response_id').range(a,b)),
      pages<AttemptStats>((a,b)=>supabase.from('reponses_apprenants').select('apprenant_id,exercice_id,tentative,status,submitted_at,reponses').in('apprenant_id',batch).eq('exercice_type','examen_blanc').order('id').range(a,b)),
      pages<AttemptStats>((a,b)=>supabase.from('reponses_apprenants_historique').select('apprenant_id,exercice_id,tentative,status,submitted_at,reponses').in('apprenant_id',batch).eq('exercice_type','examen_blanc').order('id').range(a,b)),
      pages<FirstAnswerEvent>((a,b)=>supabase.from('reponses_apprenants_journal').select('apprenant_id,exercice_id,question_id,tentative,valeur,created_at').in('apprenant_id',batch).in('exercice_id',examIds.map(e=>`${e}__${subject}`)).order('created_at').order('id').range(a,b)),
      pages<ExamStatsResult>((a,b)=>supabase.from('apprenant_quiz_results').select('id,apprenant_id,quiz_id,matiere_id,tentative,completed_at,details').in('apprenant_id',batch).in('quiz_id',examIds).eq('matiere_id',subject).order('id').range(a,b)),
      pages<ExamStatsRetake>((a,b)=>supabase.from('exam_subject_retakes').select('apprenant_id,exam_id,matiere_id,attempt_id,exercice_id,created_at').in('apprenant_id',batch).in('exam_id',examIds).eq('matiere_id',subject).order('operation_id').range(a,b)),
      pages<{id:string;auth_user_id:string|null}>((a,b)=>supabase.from('apprenants').select('id,auth_user_id').in('id',batch).order('id').range(a,b)),
      questions.some(q=>q.type==='QRC') ? pages<ExamStatsQrc>((a,b)=>supabase.from('qrc_instances_v2').select('qrc_instance_id,attempt_id,apprenant_id,question_id,reponse,etat,note,corrige_email').in('apprenant_id',batch).in('question_id',questions.filter(q=>q.type==='QRC').map(q=>`${subject}:${q.id}`)).order('qrc_instance_id').range(a,b)) : Promise.resolve([]),
    ]);
    evidence.attempts.push(...attempts);evidence.events.push(...events);evidence.states?.push(...states);evidence.legacy.push(...legacy,...archived);evidence.journal.push(...journal);evidence.results.push(...results);evidence.retakes.push(...retakes);evidence.accounts.push(...accounts);evidence.qrc?.push(...qrc);
    if(qrc.length){
      const ia=await pages<ExamStatsQrcIa>((a,b)=>supabase.from('qrc_ia_corrections').select('qrc_instance_id,statut,note,bareme').in('qrc_instance_id',qrc.map(c=>c.qrc_instance_id)).order('qrc_instance_id').order('created_at').range(a,b));
      evidence.qrcIa?.push(...ia);
    }
  }
  const {data:finalSession}=await supabase.auth.getSession();if(finalSession.session?.user.id!==user)throw new Error('Le compte connecté a changé');
  return computeExamSessionFirstPassage(questions,examIds,subject,sessions,enrollments,today,excluded,evidence);
}