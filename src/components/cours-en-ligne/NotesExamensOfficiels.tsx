import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, CheckCircle2, Clock } from 'lucide-react';
import type { ExamenNoteOfficielle } from '@/lib/notesOfficiellesEleve';
const date=(d:string|null)=>d&&Number.isFinite(Date.parse(d))?new Date(d).toLocaleString('fr-FR',{timeZone:'Europe/Paris'}):'—';
export function NotesExamensOfficiels({examens,titre}:{examens:ExamenNoteOfficielle[];titre:string}){
 return <section className="space-y-4" aria-label={titre}>
   <h3 className="text-lg font-bold text-foreground">{titre}</h3>
   {examens.length===0?<p className="text-muted-foreground">Aucune tentative de Bilan examen enregistrée.</p>:<>
   <div className="h-64 w-full min-w-0" aria-label="Évolution des notes totales sur 20">
    <ResponsiveContainer width="100%" height="100%"><LineChart data={examens} margin={{top:15,right:20,left:0,bottom:12}}>
     <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3"/><XAxis dataKey="titre" tick={{fontSize:12}}/><YAxis domain={[0,20]} ticks={[0,5,10,15,20]}/>
     <Tooltip content={({active,payload})=>active&&payload?.[0]?<div className="border border-border bg-popover text-popover-foreground p-3 text-sm shadow-sm"><strong>{payload[0].payload.titre}</strong><p>{payload[0].value}/20</p><p>{date(payload[0].payload.date)}</p></div>:null}/>
     <Line type="linear" dataKey="note" connectNulls={false} stroke="hsl(var(--primary))" strokeWidth={3} dot={{r:5}} isAnimationActive={false}/>
    </LineChart></ResponsiveContainer>
   </div>
   <div className="grid gap-3">{examens.map(e=><details key={e.id} className="border border-border rounded-lg bg-card text-card-foreground group">
    <summary className="flex flex-wrap items-center gap-3 p-4 cursor-pointer list-none">
     <span className="font-bold text-base flex-1 min-w-24">{e.titre}</span>
     <span className="text-lg font-bold text-primary">{e.note==null?e.statut:`${e.note.toFixed(1)} /20`}</span>
     <span className="text-sm flex items-center gap-1">{e.note==null?<Clock className="size-4"/>:<CheckCircle2 className="size-4"/>}{e.note!=null?e.statut:''}</span>
     <span className="text-xs text-muted-foreground basis-full sm:basis-auto">{date(e.date)}</span><ChevronDown className="size-4 group-open:rotate-180"/>
    </summary>
    <div className="border-t border-border px-4 divide-y divide-border">{e.matieres.map(m=><div key={m.id} className="py-3 flex flex-wrap justify-between gap-2 text-sm">
     <span className="font-medium flex-1 min-w-40">{m.nom}<span className="block text-xs text-muted-foreground">Coefficient {m.coefficient??'non vérifié'} · {date(m.date)}</span></span>
     <span className="font-bold">{m.note==null?m.statut:`${m.note.toFixed(1)} /20`}<span className="block text-xs font-normal text-muted-foreground">{m.note!=null?m.statut:''}</span></span>
    </div>)}</div>
   </details>)}</div></>}
 </section>;
}