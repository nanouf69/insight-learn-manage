import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { NotesParSession } from './NotesParSession';
import { listerChoixSessionsCrm, type GroupeSessionCrm } from './noyauReel';

/** Only the authorized CRM reference list, never the correction catalogue. */
export function NotesParSessionAutonome(){
  const [sessions,setSessions]=useState<GroupeSessionCrm[]|null>(null);
  const [erreur,setErreur]=useState<string|null>(null);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let alive=true;setErreur(null);
    void listerChoixSessionsCrm().then(s=>{if(alive)setSessions(s);}).catch(e=>{if(alive)setErreur(e instanceof Error?e.message:'Lecture des sessions indisponible');});
    return()=>{alive=false;};
  },[retry]);
  return <>{erreur&&<div role="alert"><p>{erreur}</p><Button variant="outline" onClick={()=>setRetry(n=>n+1)}>Réessayer</Button></div>}{sessions?<NotesParSession sessions={sessions}/>:!erreur&&<p role="status">Chargement des sessions…</p>}</>;
}