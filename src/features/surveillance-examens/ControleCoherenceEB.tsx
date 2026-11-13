import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TYPES_COHERENCE_EB, type RapportCoherenceEB } from './coherenceEB';
import { lireCoherenceEB } from './lireCoherenceEB';

export function ControleCoherenceEB(){
  const [report,setReport]=useState<RapportCoherenceEB|null>(null);const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState(false);
  const ctrl=useRef<AbortController|null>(null);const run=useRef<()=>void>(()=>{});const viewed=useRef(false);
  run.current=()=>{
    ctrl.current?.abort();const c=new AbortController();ctrl.current=c;setBusy(true);setError(null);setReport(null);viewed.current=true;
    void(async()=>{try{
      const first=await lireCoherenceEB(c.signal);
      if(first.alertes.length)await new Promise<void>((resolve,reject)=>{const t=setTimeout(resolve,5000);c.signal.addEventListener('abort',()=>{clearTimeout(t);reject(new Error('Vérification annulée'));},{once:true});});
      const second=first.alertes.length?await lireCoherenceEB(c.signal):first;
      if(c.signal.aborted)return;
      if(first.signature!==second.signature)throw new Error('Copies modifiées pendant le contrôle — relancer la vérification');
      setReport(second);
    }catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'Lecture impossible');}finally{if(ctrl.current===c)setBusy(false);}})();
  };
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    const refresh=()=>{if(!viewed.current||timer||document.visibilityState==='hidden')return;ctrl.current?.abort();setReport(null);timer=setTimeout(()=>{timer=undefined;run.current();},600);};
    let channel=supabase.channel(`coherence-eb-${Math.random().toString(36).slice(2)}`);
    for(const table of ['exam_attempts_v2','core_exam_results','qrc_instances_v2','core_exam_resets'])channel=channel.on('postgres_changes',{event:'*',schema:'public',table},refresh);
    channel.subscribe();window.addEventListener('online',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{ctrl.current?.abort();if(timer)clearTimeout(timer);void supabase.removeChannel(channel);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  return <section aria-label="Contrôle de cohérence EB" className="space-y-3 border-b py-4">
    <h2 className="text-lg font-semibold">Cohérence des copies EB1–6 TAXI/VTC</h2>
    <Button variant="outline" disabled={busy} onClick={()=>run.current()}><RefreshCw className="mr-2 h-4 w-4"/>{busy?'Vérification…':'Vérifier les copies'}</Button>
    {busy&&<Button variant="ghost" onClick={()=>{ctrl.current?.abort();setBusy(false);}}>Annuler</Button>}
    {error&&<p role="alert" className="text-destructive">Contrôle incomplet — {error}. Aucune absence d’anomalie confirmée.</p>}
    {report&&<><p>{report.candidats} comptes · {report.copies} copies actives · {report.alertes.length} constats · {new Date(report.controle).toLocaleString('fr-FR')}</p>
      <ul className="space-y-1">{Object.entries(TYPES_COHERENCE_EB).map(([k,v])=><li key={k}>{v} : {report.alertes.filter(a=>a.type===k).length}</li>)}</ul>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Candidat</th><th>Examen / matière</th><th>Constat</th><th>Copie</th></tr></thead><tbody>{report.alertes.map(a=><tr key={a.cle} className="border-t"><td><a className="text-primary underline" href={`/?section=crm&apprenant=${a.apprenantId}`}>{a.nom}</a></td><td>{a.examen} / {a.matiere}</td><td>{TYPES_COHERENCE_EB[a.type]}</td><td className="break-all">{a.attemptId}</td></tr>)}</tbody></table></div></>}
  </section>;
}