import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { readSessionAccess, ACCESS_NOT_INSTALLED, type SessionAccess } from './transport';
import { sessionChoiceLabel, type AccessSession } from './sessionChoices';

type State = { label: string; context?: SessionAccess; color: 'open'|'closed'|'unknown' };
export function sessionAccessState(context: SessionAccess, examId: string): State {
  const rows=context.exams.filter(e=>e.exam_id===examId);
  if(rows.length!==1)return {label:'Non vérifiable',color:'unknown'};
  const e=rows[0];
  if(e.opened===null && e.operation_id===null)return {label:'Accès habituel (aucune restriction manuelle)',context,color:'unknown'};
  if(typeof e.opened!=='boolean'||!e.operation_id)return {label:'Non vérifiable',color:'unknown'};
  return {label:e.opened?'Ouvert':'Fermé',context,color:e.opened?'open':'closed'};
}
export default function MultiSessionExamAccess({examId,choices}:{examId:string;choices:(AccessSession&{current:boolean})[]}) {
  const [selected,setSelected]=useState<string[]>([]),[states,setStates]=useState<Record<string,State>>({});
  const [reload,setReload]=useState(0),[confirm,setConfirm]=useState<boolean|null>(null);
  const key=choices.map(s=>s.id).join('|');
  useEffect(()=>{
    let cancelled=false;setStates({});setConfirm(null);
    setSelected(prev=>prev.filter(id=>choices.some(s=>s.id===id)));
    void (async()=>{
      // Bounded reads, no periodic refresh. Reuse the existing source of truth.
      for(let offset=0;offset<choices.length;offset+=4){
        await Promise.all(choices.slice(offset,offset+4).map(async s=>{
          let state:State;
          try{state=sessionAccessState(await readSessionAccess(s.id),examId);}
          catch(e){state={label:e instanceof Error&&e.message===ACCESS_NOT_INSTALLED?'Contrôle non installé':'Non vérifiable',color:'unknown'};}
          if(!cancelled)setStates(prev=>({...prev,[s.id]:state}));
        }));
      }
    })();
    return()=>{cancelled=true;};
  },[key,examId,reload]);
  const picked=choices.filter(s=>selected.includes(s.id));
  const readable=picked.length>0&&picked.every(s=>!!states[s.id]?.context);
  return <div className="space-y-3 min-w-0">
    <fieldset className="space-y-2"><legend className="text-sm font-medium mb-2">Choisir explicitement les sessions présentielles</legend>
      {choices.map(s=><div key={s.id} className="border-b border-border py-2 space-y-1">
        <label className="flex items-start gap-3 cursor-pointer text-sm" htmlFor={`session-${examId}-${s.id}`}>
          <Checkbox id={`session-${examId}-${s.id}`} checked={selected.includes(s.id)} className="mt-1" onCheckedChange={checked=>{setConfirm(null);setSelected(prev=>checked===true?[...prev.filter(id=>id!==s.id),s.id]:prev.filter(id=>id!==s.id));}}/>
          <span className={s.current?'text-destructive font-semibold':''}>{sessionChoiceLabel(s)}</span>
        </label>
        <p role="status" className={`ml-7 text-sm font-medium ${states[s.id]?.color==='open'?'text-success':states[s.id]?.color==='closed'?'text-destructive':'text-muted-foreground'}`}>{states[s.id]?.label??'Non vérifiable — lecture en cours'}</p>
      </div>)}
    </fieldset>
    <p className="text-xs text-muted-foreground">Vert : ouvert explicitement · Rouge « Fermé » : fermé explicitement. « En cours » en rouge indique uniquement les dates de la session.</p>
    <Button variant="outline" size="sm" onClick={()=>setReload(r=>r+1)}>Relire les états</Button>
    <div className="flex flex-col gap-2">
      <Button variant="outline" disabled={!readable} onClick={()=>setConfirm(true)}>Ouvrir les sessions sélectionnées</Button>
      <Button variant="outline" disabled={!readable} onClick={()=>setConfirm(false)}>Fermer les sessions sélectionnées</Button>
    </div>
    <p className="text-xs text-muted-foreground">Enregistrement groupé non activé : aucune modification d’accès possible dans cet aperçu.</p>
    <Dialog open={confirm!==null&&readable} onOpenChange={open=>{if(!open)setConfirm(null);}}><DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
      <DialogHeader><DialogTitle>{confirm?'Ouvrir':'Fermer'} les sessions sélectionnées — {examId}</DialogTitle></DialogHeader>
      <ul className="space-y-2">{picked.map(s=><li key={s.id} className="text-sm"><strong>{sessionChoiceLabel(s)}</strong><p>{states[s.id]?.label}</p></li>)}</ul>
      <p>Les épreuves déjà commencées, réponses, chronomètres et autres examens restent inchangés.</p>
      <p role="alert" className="text-sm text-muted-foreground">Confirmation préparée uniquement. Le contrôle atomique multi-session et toutes les protections doivent être validés avant activation.</p>
      <Button disabled>Confirmer — contrôle groupé non activé</Button>
      <Button variant="outline" onClick={()=>setConfirm(null)}>Annuler sans modifier les accès</Button>
    </DialogContent></Dialog>
  </div>;
}