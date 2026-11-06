import { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { readFirstPassage } from '@/lib/premierPassageStatsRead';
import { readExamFirstPassage } from '@/lib/premierPassageExamStatsRead';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { selectFirstPassageView, type FirstPassageFilter as Filter, type QuestionRate, type QuestionStatsTarget, type SessionFirstPassage } from '@/lib/premierPassageStats';
type State = { data: SessionFirstPassage | null; loading:boolean; error:string|null };
const Context=createContext<State & {filter: Filter; sessionId: string; exam: boolean}>({data:null,loading:true,error:null,filter:'global',sessionId:'all',exam:false});
const MOIS=['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'];
const nomCourt=(s:{nom?:string|null;date_fin:string;mode:string})=>`${(s.nom ?? 'Session').split(' - ')[0].replace(/^Session\s+/i,'').replace(/cours du soir/i,'').trim()} ${MOIS[Number(s.date_fin.slice(5,7))-1] ?? ''} ${s.mode==='jour'?'journée':'soir'}`.replace(/\s+/g,' ');
const dateLabel = (value:string) => value.split('-').reverse().join('/');
export function FirstPassageProvider({moduleId,exerciseId,questions,enabled,children,examId,subjectId}:{moduleId:number;exerciseId:number;questions:QuestionStatsTarget[];enabled:boolean;children:React.ReactNode;examId?:string;subjectId?:string}) {
  const [state,setState]=useState<State>({data:null,loading:true,error:null});const [reload,setReload]=useState(0);
  const [filter,setFilter]=useState<Filter>('global');
  const [sessionId,setSessionId]=useState('all');
  useEffect(()=>{
    if(!enabled)return;let cancelled=false;
    setState({data:null,loading:true,error:null});
    const read=examId && subjectId ? readExamFirstPassage(examId,subjectId,questions) : readFirstPassage(moduleId,exerciseId,questions);
    read.then(data=>{if(!cancelled)setState({data,loading:false,error:null});}).catch(()=>{if(!cancelled)setState({data:null,loading:false,error:examId ? 'Données insuffisantes — lecture des preuves non confirmée' : 'Statistiques indisponibles — lecture non confirmée'});});
    return ()=>{cancelled=true;};
  },[moduleId,exerciseId,questions,enabled,reload,examId,subjectId]);
  const available=state.data?.sessions.filter(s=>filter==='global' || s.mode===filter) ?? [];
  const retained=state.data ? selectFirstPassageView(state.data,filter,sessionId).sessions : [];
  return <Context.Provider value={{...state,filter,sessionId,exam:!!examId}}>{enabled && <section aria-label="Sessions retenues pour le premier passage" className="min-w-0 space-y-2 py-2 text-xs text-muted-foreground">
    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-foreground">Sessions en cours{state.data ? ` au ${dateLabel(state.data.today)}` : ''}</span><Button size="icon" variant="ghost" disabled={state.loading} aria-label="Actualiser les taux du premier passage" title="Actualiser les taux du premier passage" onClick={()=>setReload(r=>r+1)}><RefreshCw className="h-3.5 w-3.5" /></Button></div>
    <Tabs value={filter} onValueChange={v=>{if(v==='global'||v==='jour'||v==='soir'){setFilter(v);setSessionId('all');}}}><TabsList className="flex h-auto w-fit max-w-full flex-wrap"><TabsTrigger value="global">Global</TabsTrigger><TabsTrigger value="jour">JOURNÉE</TabsTrigger><TabsTrigger value="soir">SOIRÉE</TabsTrigger></TabsList></Tabs>
    {available.length>0 && <Select value={sessionId} onValueChange={setSessionId}><SelectTrigger aria-label="Filtrer par session en cours" className="h-auto min-h-10 max-w-full text-xs [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:text-left"><SelectValue /></SelectTrigger><SelectContent className="max-w-[calc(100vw-2rem)]"><SelectItem value="all">Toutes les sessions en cours{filter==='jour'?' — JOURNÉE':filter==='soir'?' — SOIRÉE':''}</SelectItem>{available.map(s=><SelectItem key={s.id} value={s.id}>{s.nom ?? 'Session sans intitulé'} · {dateLabel(s.date_debut)} – {dateLabel(s.date_fin)} · {s.mode==='jour'?'JOURNÉE':'SOIRÉE'}</SelectItem>)}</SelectContent></Select>}
    {state.error ? <p role="status" className="text-destructive">{state.error}</p> : state.loading ? <p>Lecture des sessions…</p> : retained.length===0 ? <p>Aucune session en cours</p> : <ul className="space-y-1">{retained.map(s=><li key={s.id} className="break-words"><strong>{s.mode==='jour'?'JOURNÉE':'SOIRÉE'}</strong> · {s.nom ?? 'Session sans intitulé'} · {dateLabel(s.date_debut)} – {dateLabel(s.date_fin)} · {s.eligible} élève(s) éligible(s)</li>)}</ul>}
  </section>}{children}</Context.Provider>;
}
export function QuestionFirstPassageRate({questionId}:{questionId:number}) {
  const {data,filter,sessionId,loading,error,exam}=useContext(Context);
    if(loading)return <p className="text-xs text-muted-foreground">Erreur 1er passage : chargement…</p>;
  if(error)return <p role="status" className="text-xs text-destructive">{error}</p>;
  const view=data ? selectFirstPassageView(data,filter,sessionId) : null;
  const sessions=view?.sessions ?? [];
  if(!sessions.length)return <p className="text-xs text-muted-foreground">Aucune session en cours</p>;
  const r=view?.rates[String(questionId)];
  if(!r)return <p className="text-xs text-muted-foreground">Premier passage non prouvé</p>;
  const court=(r:QuestionRate)=>exam && r.total===0 && r.unknown>0 ? 'données insuffisantes' : r.total ? `${Math.round(r.incorrect/r.total*100)} % (${r.incorrect}/${r.total})` : 'aucune réponse';
  return <div className="my-1 space-y-0.5 text-xs text-muted-foreground">{sessions.map(s=>{const rate=data?.sessionRates[s.id]?.[String(questionId)];const echec=!!rate && rate.total>0 && rate.incorrect>0;return <p key={s.id} className={`break-words ${echec ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>{nomCourt(s)} : {rate ? court(rate) : 'non prouvé'}{rate?.unknown ? ` · ${rate.unknown} non prouvé(s)` : ''}</p>;})}</div>;
}