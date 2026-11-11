import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SessionExamAccess } from './SessionExamAccess';
export interface AccessSession {id:string;nom:string|null;date_debut:string|null;date_fin:string|null;types_apprenant:string[]|null}
/** Server role proof, never a prop or browser storage as authorization. One read per exam list. */
export function useExamAccessSessions(requested:boolean) {
 const [state,setState]=useState<{verified:boolean;sessions:AccessSession[];error:string}>({verified:false,sessions:[],error:''});
 useEffect(()=>{
  let cancelled=false;setState({verified:false,sessions:[],error:''});
  if(!requested)return;
  void (async()=>{
   try {
    const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user)return;
    const role=await supabase.rpc('has_role',{_user_id:auth.data.user.id,_role:'admin'});
    if(role.error||role.data!==true)return;
    if(cancelled)return;
    setState({verified:true,sessions:[],error:''});
    const sessions:AccessSession[]=[];
    for(let from=0;;from+=1000){
     const {data,error}=await supabase.from('sessions').select('id,nom,date_debut,date_fin,types_apprenant')
      .in('type_session',['theorique','theorique_pratique','vtc','vtc_soir','taxi']).order('id').range(from,from+999);
     if(error)throw error;
     sessions.push(...(data??[]));if((data??[]).length<1000)break;
    }
    if(!cancelled)setState({verified:true,sessions,error:''});
   }catch{if(!cancelled)setState(previous=>({...previous,error:'Les sessions présentielles ne peuvent pas être lues. Aucune modification possible.'}));}
  })();
  return()=>{cancelled=true;};
 },[requested]);
 return state;
}
export function ExamCardAccess({examId,access}:{examId:string;access:ReturnType<typeof useExamAccessSessions>}) {
 const [sessionId,setSessionId]=useState('');
 if(!access.verified)return null;
 const chosen=access.sessions.find(s=>s.id===sessionId);
 return <div data-testid={`acces-carte-${examId}`} className="mt-3 space-y-2 border-t border-border pt-3" onClick={e=>e.stopPropagation()}>
  <p className="text-sm font-semibold">Accès présentiel — {examId}</p>
  <label className="block text-sm" htmlFor={`session-acces-${examId}`}>Session présentielle</label>
  <select id={`session-acces-${examId}`} className="w-full rounded-md border border-input bg-background p-2 text-sm text-foreground" value={sessionId} onChange={e=>setSessionId(e.target.value)}>
   <option value="">Choisir explicitement une session</option>
   {access.sessions.map(s=><option key={s.id} value={s.id}>{s.nom??'Session sans nom'} · {s.date_debut??'?'} — {s.date_fin??'?'} · {s.id}</option>)}
  </select>
  {access.error && <p role="alert" className="text-sm text-destructive">{access.error}</p>}
  {chosen && <SessionExamAccess key={`${examId}:${chosen.id}`} sessionId={chosen.id} sessionName={chosen.nom??'Session sans nom'} examId={examId} compact/>}
 </div>;
}