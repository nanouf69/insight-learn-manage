import {useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import type {TentativeReelle} from './noyauReel';
import {useExamCurrentCorrection} from '@/hooks/useExamCurrentCorrection';
import {ExamCurrentCorrectionNotice} from '@/components/cours-en-ligne/ExamCurrentCorrectionNotice';
import type {Question} from '@/components/cours-en-ligne/examens-blancs-data';
/** Same immutable attempt, read-only. QCM-only copies never need grading controls. */
export function CopieNativeLecture({tentative}:{tentative:TentativeReelle}){
 const current=useExamCurrentCorrection(tentative.exam_id,tentative.apprenant_id,tentative.etat==='terminee');
 const [answers,setAnswers]=useState<Record<string,unknown>>({}),[error,setError]=useState(false);
 useEffect(()=>{let cancelled=false;setError(false);setAnswers({});void(async()=>{try{const rows:any[]=[];for(let de=0;;de+=1000){const {data,error}=await supabase.from('answer_state').select('question_id,valeur').eq('attempt_id',tentative.attempt_id).order('response_id').range(de,de+999);if(error)throw error;rows.push(...data);if(data.length<1000)break;}if(!cancelled)setAnswers(Object.fromEntries(rows.map(r=>[r.question_id,r.valeur])));}catch{if(!cancelled)setError(true);}})();return()=>{cancelled=true;};},[tentative.attempt_id]);
 return <section aria-label="Copie V2 — consultation" className="space-y-3"><h2 className="font-semibold">{tentative.candidat} — {tentative.consultationSeule?'Archive V2 neutralisée — lecture seule':'Copie V2 native'}</h2>{error?<p role="alert" className="text-destructive">Réponses non relues : consultation incomplète.</p>:tentative.snapshot.questions.map(q=><article key={q.id} className="space-y-2 border-b border-border py-3"><h3 className="font-medium">{q.enonce}</h3><p className="whitespace-pre-wrap">{Array.isArray(answers[q.id])?(answers[q.id] as string[]).join(' + '):String(answers[q.id]??'Sans réponse enregistrée')}</p>{Array.isArray((q as any).choix)&&<ul className="text-sm text-muted-foreground">{(q as any).choix.map((c:any,i:number)=><li key={i}>{c.lettre} — {c.texte}</li>)}</ul>}</article>)}</section>;
}