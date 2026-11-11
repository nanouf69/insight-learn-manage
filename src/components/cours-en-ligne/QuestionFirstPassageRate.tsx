import { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
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
export function QuestionFirstPassageRate({questionId,presentation='inline'}:{questionId:number;presentation?:'inline'|'panel'}) {
  const {data,filter,sessionId,loading,error,exam}=useContext(Context);
  const [detailSession,setDetailSession]=useState<string|null>(null);
  const [errorsOnly,setErrorsOnly]=useState(false);
  useEffect(()=>{setDetailSession(null);setErrorsOnly(false);},[data,questionId,filter,sessionId]);
  const view=data ? selectFirstPassageView(data,filter,sessionId) : null;
  const sessions=view?.sessions ?? [];
  const r=view?.rates[String(questionId)];
  const court=(r:QuestionRate)=>r.total===0 && r.unknown>0 ? 'données insuffisantes' : r.total ? `${Math.round(r.incorrect/r.total*100)} % (${r.incorrect}/${r.total})` : 'aucune réponse';

  const selected=sessions.find(s=>s.id===detailSession);
  const detailRate=selected?data?.sessionRates[selected.id]?.[String(questionId)]:undefined;
  const details=detailRate?.details??[];
  const counted=details.filter(d=>d.verdict!=='unknown');
  const excluded=details.filter(d=>d.verdict==='unknown');
  const detail=selected && detailRate ? <section aria-label={`Premières réponses — ${nomCourt(selected)}`} className="mt-3 space-y-3 border-t pt-3 text-xs">
    <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{nomCourt(selected)} — Question {questionId}</h3><Button variant="ghost" size="icon" aria-label="Fermer le détail des premières réponses" onClick={()=>setDetailSession(null)}><X className="h-4 w-4" /></Button></div>
    <p>{detailRate.incorrect} erreur(s) / {detailRate.total} première(s) réponse(s) évaluée(s) · {detailRate.unknown} non évaluée(s), exclue(s) du taux.</p>
    <p className="text-muted-foreground">QCM : toutes les bonnes réponses, aucune autre. QRC : totalité du barème figé requise ; attente hors taux. Sans réponse : hors dénominateur. Inscriptions croisées : un candidat par session, sans additionner les lignes.</p>
    <label className="flex items-center gap-2"><input type="checkbox" checked={errorsOnly} onChange={e=>setErrorsOnly(e.target.checked)} />Erreurs seulement</label>
    {counted.length!==detailRate.total?<p role="status">Détail non disponible pour cette lecture : actualisez les taux.</p>:<ul className="space-y-3">{counted.filter(d=>!errorsOnly||d.verdict==='incorrect').map(d=><li key={d.learnerId} className="space-y-1 border-b pb-3 break-words"><p className="font-semibold">{d.candidate??d.learnerId} · {d.verdict==='correct'?'Réussite':'Erreur'}</p><p>Réponse : {formatAnswer(d.answer)}</p><p>Attendu du passage : {formatAnswer(d.expected)}{d.points!=null?` · barème ${d.points}`:''}</p><p className="text-muted-foreground">{d.exam??'Exercice'} · {d.subject??''} · {d.tentative?`tentative ${d.tentative}`:'numéro de tentative non consigné'} · {d.at?new Date(d.at).toLocaleString('fr-FR',{timeZone:'Europe/Paris'}):'date non prouvée'}</p><p className="text-muted-foreground">Passage : {d.passage??'non prouvé'} · Version/preuve figée : {d.version??'non consignée'}</p></li>)}</ul>}
    {excluded.length>0&&<section aria-label="Réponses non évaluées"><h4 className="font-semibold">Non évaluées — données insuffisantes ({excluded.length})</h4><ul className="mt-2 space-y-2">{excluded.map(d=><li key={d.learnerId} className="break-words"><strong>{d.candidate??d.learnerId}</strong> · {formatAnswer(d.answer)}<p>{d.reason??'Première réponse ou correction non prouvée'}</p><p className="text-muted-foreground">{d.exam} · {d.passage??'passage non prouvé'} · {d.version??'version non prouvée'}</p></li>)}</ul></section>}
    {!details.length&&detailRate.total===0&&<p>Aucune première réponse évaluable dans cette session.</p>}
  </section>:null;
  const open=(id:string)=>{setErrorsOnly(false);setDetailSession(id);};
  if(presentation==='panel') {
    let content:React.ReactNode;
    if(loading)content=<p className="text-xs text-muted-foreground">Chargement des taux…</p>;
    else if(error)content=<p role="status" className="text-xs text-destructive">{error}</p>;
    else if(!sessions.length)content=<p className="text-xs text-muted-foreground">Aucune session en cours</p>;
    else if(!r)content=<p className="text-xs text-muted-foreground">Aucune donnée de premier passage</p>;
    else content=<ul className="space-y-2">{sessions.map(s=>{const rate=data?.sessionRates[s.id]?.[String(questionId)];const echec=!!rate && rate.total>0 && rate.incorrect>0;return <li key={s.id} className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 text-xs last:border-0 last:pb-0"><Button variant="ghost" className="h-auto w-full items-start justify-between gap-3 whitespace-normal p-0 text-xs hover:bg-transparent" onClick={()=>open(s.id)}><span className="min-w-0 text-left leading-4 text-muted-foreground">{nomCourt(s)}</span><span className={`shrink-0 text-right leading-4 ${echec ? 'font-semibold text-destructive' : 'font-medium text-foreground'}`}>{rate ? court(rate) : 'aucune donnée'}</span></Button></li>;})}</ul>;
    return <section className="space-y-3" aria-label="Taux d’erreur au premier essai"><div><p className="text-xs font-semibold uppercase tracking-wide text-foreground">Erreur au 1er essai</p><p className="mt-0.5 text-[11px] text-muted-foreground">Premières réponses, par session</p></div>{content}{detail}</section>;
  }

  if(loading)return <p className="text-xs text-muted-foreground">Erreur 1er passage : chargement…</p>;
  if(error)return <p role="status" className="text-xs text-destructive">{error}</p>;
  if(!sessions.length)return <p className="text-xs text-muted-foreground">Aucune session en cours</p>;
  if(!r)return <p className="text-xs text-muted-foreground">Aucune donnée de premier passage</p>;
  return <div className="my-1 space-y-0.5 text-xs text-muted-foreground">{sessions.map(s=>{const rate=data?.sessionRates[s.id]?.[String(questionId)];const echec=!!rate && rate.total>0 && rate.incorrect>0;return <Button variant="ghost" onClick={()=>open(s.id)} key={s.id} className={`break-words ${echec ? 'font-semibold text-destructive' : 'text-muted-foreground'} h-auto w-full justify-start whitespace-normal p-0 text-left text-xs`}>{nomCourt(s)} : {rate ? court(rate) : 'aucune donnée'}</Button>;})}{detail}</div>;
}
function formatAnswer(value:unknown):string { return Array.isArray(value)?value.join(" + "):typeof value==="string"?value: value==null?"Non prouvé":JSON.stringify(value); }
