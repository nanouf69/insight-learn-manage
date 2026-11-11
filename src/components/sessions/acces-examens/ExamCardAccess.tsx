import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MultiSessionExamAccess from './MultiSessionExamAccess';
import { nextParisDayDelay, sessionChoices, type AccessSession, type ExamCatalogEntry } from './sessionChoices';
export type { AccessSession } from './sessionChoices';
/** Server role proof, never a prop or browser storage as authorization. One read per exam list. */
export function useExamAccessSessions(requested:boolean) {
 const [state,setState]=useState<{verified:boolean;sessions:AccessSession[];catalog:ExamCatalogEntry[];error:string}>({verified:false,sessions:[],catalog:[],error:''});
 useEffect(()=>{
  let cancelled=false;setState({verified:false,sessions:[],catalog:[],error:''});
  if(!requested)return;
  void (async()=>{
   try {
    const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user)return;
    const role=await supabase.rpc('has_role',{_user_id:auth.data.user.id,_role:'admin'});
    if(role.error||role.data!==true)return;
    if(cancelled)return;
    setState({verified:true,sessions:[],catalog:[],error:''});
    const {data:catalog,error:catalogError}=await supabase.from('examens_blancs_parcours').select('exam_id,module_id').order('exam_id');
    if(catalogError)throw catalogError;
    const sessions:AccessSession[]=[];
    for(let from=0;;from+=1000){
     const {data,error}=await supabase.from('sessions').select('id,nom,date_debut,date_fin,types_apprenant,type_session')
      .in('type_session',['theorique','theorique_pratique','vtc','vtc_soir','taxi']).order('id').range(from,from+999);
     if(error)throw error;
     sessions.push(...(data??[]));if((data??[]).length<1000)break;
    }
    if(!cancelled)setState({verified:true,sessions,catalog:catalog??[],error:''});
   }catch{if(!cancelled)setState(previous=>({...previous,sessions:[],catalog:[],error:'Les sessions présentielles ne peuvent pas être lues. Aucune modification possible.'}));}
  })();
  return()=>{cancelled=true;};
 },[requested]);
 return state;
}
export function ExamCardAccess({examId,access}:{examId:string;access:ReturnType<typeof useExamAccessSessions>}) {
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{
  const timer=setTimeout(()=>setNow(new Date()),nextParisDayDelay(now));
  const resume=()=>setNow(new Date());
  window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
  return()=>{clearTimeout(timer);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume);};
 },[now]);
 const choices=sessionChoices(access.sessions,examId,access.catalog,now);
 if(!access.verified)return null;
 return <div data-testid={`acces-carte-${examId}`} className="mt-3 space-y-2 border-t border-border pt-3" onClick={e=>e.stopPropagation()}>
  <p className="text-sm font-semibold">Accès présentiel — {examId}</p>
  {!access.error&&choices.length>0&&<MultiSessionExamAccess examId={examId} choices={choices}/>}
  {!access.error&&choices.length===0&&<p className="text-sm text-muted-foreground">Aucune session présentielle compatible en cours ou à venir.</p>}
  {access.error && <p role="alert" className="text-sm text-destructive">{access.error}</p>}
 </div>;
}