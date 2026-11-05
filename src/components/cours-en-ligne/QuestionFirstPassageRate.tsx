import { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { readFirstPassage } from '@/lib/premierPassageStatsRead';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { QuestionRate, QuestionStatsTarget, SessionFirstPassage } from '@/lib/premierPassageStats';
type Filter = 'global' | 'jour' | 'soir';
type State = { data: SessionFirstPassage | null; loading:boolean; error:string|null };
const Context=createContext<State & {filter: Filter}>({data:null,loading:true,error:null,filter:'global'});
const dateLabel = (value:string) => value.split('-').reverse().join('/');
const rateLabel = (r:QuestionRate) => r.total ? `Erreur 1er passage : ${Math.round(r.incorrect/r.total*100)} % (${r.incorrect}/${r.total})` : 'Aucune réponse';
export function FirstPassageProvider({moduleId,exerciseId,questions,enabled,children}:{moduleId:number;exerciseId:number;questions:QuestionStatsTarget[];enabled:boolean;children:React.ReactNode}) {
  const [state,setState]=useState<State>({data:null,loading:true,error:null});const [reload,setReload]=useState(0);
  const [filter,setFilter]=useState<Filter>('global');
  useEffect(()=>{
    if(!enabled)return;let cancelled=false;
    setState({data:null,loading:true,error:null});
    readFirstPassage(moduleId,exerciseId,questions).then(data=>{if(!cancelled)setState({data,loading:false,error:null});}).catch(()=>{if(!cancelled)setState({data:null,loading:false,error:'Statistiques indisponibles — lecture non confirmée'});});
    return ()=>{cancelled=true;};
  },[moduleId,exerciseId,questions,enabled,reload]);
  const retained=state.data?.sessions.filter(s=>filter==='global' || s.mode===filter) ?? [];
  return <Context.Provider value={{...state,filter}}>{enabled && <section aria-label="Sessions retenues pour le premier passage" className="min-w-0 space-y-2 py-2 text-xs text-muted-foreground">
    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-foreground">Sessions en cours{state.data ? ` au ${dateLabel(state.data.today)}` : ''}</span><Button size="icon" variant="ghost" disabled={state.loading} aria-label="Actualiser les taux du premier passage" title="Actualiser les taux du premier passage" onClick={()=>setReload(r=>r+1)}><RefreshCw className="h-3.5 w-3.5" /></Button></div>
    <Tabs value={filter} onValueChange={v=>{if(v==='global'||v==='jour'||v==='soir')setFilter(v);}}><TabsList className="flex h-auto w-fit max-w-full flex-wrap"><TabsTrigger value="global">Global</TabsTrigger><TabsTrigger value="jour">JOURNÉE</TabsTrigger><TabsTrigger value="soir">SOIRÉE</TabsTrigger></TabsList></Tabs>
    {state.error ? <p role="status" className="text-destructive">{state.error}</p> : state.loading ? <p>Lecture des sessions…</p> : retained.length===0 ? <p>Aucune session en cours</p> : <ul className="space-y-1">{retained.map(s=><li key={s.id} className="break-words"><strong>{s.mode==='jour'?'JOURNÉE':'SOIRÉE'}</strong> · {s.nom ?? 'Session sans intitulé'} · {dateLabel(s.date_debut)} – {dateLabel(s.date_fin)} · {s.eligible} élève(s) éligible(s)</li>)}</ul>}
  </section>}{children}</Context.Provider>;
}
export function QuestionFirstPassageRate({questionId}:{questionId:number}) {
  const {data,filter,loading,error}=useContext(Context);
  if(loading)return <p className="text-xs text-muted-foreground">Erreur 1er passage : chargement…</p>;
  if(error)return <p role="status" className="text-xs text-destructive">{error}</p>;
  const sessions=data?.sessions.filter(s=>filter==='global' || s.mode===filter) ?? [];
  if(!sessions.length)return <p className="text-xs text-muted-foreground">Aucune session en cours</p>;
  const r=(filter==='global'?data?.rates:data?.modeRates[filter])?.[String(questionId)];
  if(!r)return <p className="text-xs text-muted-foreground">Premier passage non prouvé</p>;
  return <div className="my-1 space-y-1 text-xs"><p className="font-semibold text-foreground">{rateLabel(r)} · {r.total} élève(s) ayant répondu au premier essai prouvé</p>{r.unknown>0 && <p className="text-warning">Taux partiel : {r.unknown} apprenant(s) exclu(s), premier passage ou corrigé historique non prouvé{r.total===0 ? ' — aucune réponse exploitable' : ''}</p>}
    {filter==='global' && (['jour','soir'] as const).map(mode=>{const rate=data?.modeRates[mode]?.[String(questionId)];return <p key={mode} className="text-muted-foreground">{mode==='jour'?'JOURNÉE':'SOIRÉE'} : {data?.sessions.some(s=>s.mode===mode) && rate ? rateLabel(rate) : 'Aucune session en cours'}</p>;})}
    {sessions.map(s=>{const rate=data?.sessionRates[s.id]?.[String(questionId)];return <p key={s.id} className="break-words text-muted-foreground">{s.nom ?? 'Session sans intitulé'} · {dateLabel(s.date_debut)} – {dateLabel(s.date_fin)} · {s.mode==='jour'?'JOURNÉE':'SOIRÉE'} : {rate ? rateLabel(rate) : 'Premier passage non prouvé'}{rate?.unknown ? ` · ${rate.unknown} premier(s) passage(s) non prouvé(s)` : ''}</p>;})}
    {filter==='global' && r.mixte>0 && <p className="text-muted-foreground">{r.mixte} élève(s) JOURNÉE + SOIRÉE : une fois par catégorie, une seule fois au global.</p>}
  </div>;
}