import { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { readFirstPassage } from '@/lib/premierPassageStatsRead';
import type { QuestionRate, QuestionStatsTarget } from '@/lib/premierPassageStats';
type State = { rates: Record<string,QuestionRate>; loading:boolean; error:string|null };
const Context=createContext<State>({rates:{},loading:true,error:null});
export function FirstPassageProvider({moduleId,exerciseId,questions,enabled,children}:{moduleId:number;exerciseId:number;questions:QuestionStatsTarget[];enabled:boolean;children:React.ReactNode}) {
  const [state,setState]=useState<State>({rates:{},loading:true,error:null});const [reload,setReload]=useState(0);
  useEffect(()=>{
    if(!enabled)return;let cancelled=false;
    setState({rates:{},loading:true,error:null});
    readFirstPassage(moduleId,exerciseId,questions).then(rates=>{if(!cancelled)setState({rates,loading:false,error:null});}).catch(()=>{if(!cancelled)setState({rates:{},loading:false,error:'Statistiques indisponibles — lecture non confirmée'});});
    return ()=>{cancelled=true;};
  },[moduleId,exerciseId,questions,enabled,reload]);
  return <Context.Provider value={state}>{enabled && <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>Sessions actuellement en formation · JOUR + SOIR · réponses prouvées uniquement</span><Button size="icon" variant="ghost" disabled={state.loading} aria-label="Actualiser les taux du premier passage" title="Actualiser les taux du premier passage" onClick={()=>setReload(r=>r+1)}><RefreshCw className="h-3.5 w-3.5" /></Button></div>}{children}</Context.Provider>;
}
export function QuestionFirstPassageRate({questionId}:{questionId:number}) {
  const {rates,loading,error}=useContext(Context);const r=rates[String(questionId)];
  if(loading)return <p className="text-xs text-muted-foreground">Erreur 1er passage : chargement…</p>;
  if(error)return <p role="status" className="text-xs text-destructive">{error}</p>;
  if(!r)return <p className="text-xs text-muted-foreground">Premier passage non prouvé</p>;
  const summary=r.total ? `Erreur 1er passage : ${Math.round(r.incorrect/r.total*100)} % (${r.incorrect}/${r.total})` : 'Aucune réponse';
  return <div className="my-1 text-xs"><p className="font-semibold text-foreground">{summary}</p>{r.unknown>0 && <p className="text-warning">{r.unknown} apprenant(s) exclu(s) : premier passage ou corrigé historique non prouvé</p>}{(r.jour.total>0 || r.soir.total>0) && <p className="text-muted-foreground">JOUR : {r.jour.incorrect}/{r.jour.total} · SOIR : {r.soir.incorrect}/{r.soir.total}{r.mixte>0 ? ` · JOUR + SOIR : ${r.mixte} (comptés une fois au global)` : ''}</p>}</div>;
}