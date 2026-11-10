import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RichText } from "@/components/ui/rich-text";
import { commanderRevisionVersionnee, ouvrirRevisionVersionnee, relireRevisionVersionnee, type RevisionRef, type RevisionVersionnee } from "@/lib/revisionCorrigeVersionnee";
import { cleSource, statutPedagogique } from "@/lib/corrigesSources";

/** Isolated future revision screen; never writes old exam answers, results or completion. */
export function RevisionCorrigeVersionnee({owner,refs,onExit}: {owner:string;refs:RevisionRef[];onExit:()=>void}) {
  const [state,setState] = useState<RevisionVersionnee|null>(null);
  const [drafts,setDrafts] = useState<Record<string,unknown>>({});
  const [index,setIndex] = useState(0);
  const [error,setError] = useState<string|null>(null);
  const [busy,setBusy] = useState(false);
  const pending = useRef<{state:RevisionVersionnee;payload:Parameters<typeof commanderRevisionVersionnee>[1];operation:string}|null>(null);
  const flight = useRef(false);
  const refsKey = JSON.stringify(refs);
  useEffect(()=>{
    let alive=true;
    void ouvrirRevisionVersionnee(owner,refs).then(s=>{if(alive){setState(s);setDrafts(s.answers);}})
      .catch(()=>{if(alive)setError("Révision non ouverte : corrigé ou identité non confirmés.");});
    return ()=>{alive=false;};
    // Serialized stable question identities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[owner,refsKey]);
  const reread=async()=>{
    if(!state || flight.current)return;
    try{const s=await relireRevisionVersionnee(owner,state.id);setState(s);pending.current=null;setError(null);}
    catch{setError("Relecture impossible. Votre saisie locale est conservée.");}
  };
  const send=async(payload:Parameters<typeof commanderRevisionVersionnee>[1])=>{
    if(!state || flight.current)return;
    flight.current=true;setBusy(true);
    const cmd=pending.current ?? {state,payload,operation:crypto.randomUUID()};
    pending.current=cmd;
    try{const s=await commanderRevisionVersionnee(cmd.state,cmd.payload,cmd.operation);setState(s);pending.current=null;setError(null);}
    catch{setError("Réponse non confirmée : conflit ou corrigé modifié. Relisez sans perdre votre saisie, puis vérifiez-la.");}
    finally{flight.current=false;setBusy(false);}
  };
  const source=state?.sources[index];
  const key=source ? cleSource(source.source_type,source.source_id,source.question_id):"";
  const answer=drafts[key] ?? state?.answers[key];
  const q=source?.actuelle;
  return <section aria-label="Révision versionnée" className="space-y-4 min-w-0">
    <h2 className="text-xl font-bold">Questions à refaire</h2>
    {error && <div role="alert" className="text-destructive"><p>{error}</p><Button variant="outline" disabled={busy} onClick={()=>void reread()}>Relire les réponses enregistrées</Button></div>}
    {!state && !error && <p>Lecture du corrigé officiel…</p>}
    {state?.submission ? <div><p>Révision remise : {state.submission.perfect}/{state.submission.total} réponses parfaites.</p>
      {state.submission.qrc_a_verifier>0 && <p>{state.submission.qrc_a_verifier} QRC à vérifier, sans note humaine attribuée.</p>}
      <Button onClick={onExit}>Retour aux résultats</Button></div> : q && state && <>
      <p>{source.exam_id} · {source.question_id} · Corrigé officiel version {source.version}</p>
      <RichText content={q.enonce}/>
      {q.type==="QCM" ? <div className="space-y-2">{q.choix?.map(c=><label key={c.lettre} className="flex items-start gap-3 border border-border rounded-md p-3">
        <input type="checkbox" checked={Array.isArray(answer)&&answer.includes(c.lettre)} onChange={()=>{
          const prev=Array.isArray(answer)?answer:[];
          setDrafts(d=>({...d,[key]:prev.includes(c.lettre)?prev.filter(l=>l!==c.lettre):[...prev,c.lettre]}));
        }}/><span>{c.lettre}. {c.texte}</span></label>)}</div>
        : <Textarea aria-label="Votre réponse" value={typeof answer==="string"?answer:""} onChange={e=>setDrafts(d=>({...d,[key]:e.target.value}))}/>}
      <Button disabled={busy || !!error} onClick={()=>void send({kind:"answer",key,answer:answer ?? (q.type==="QCM"?[]:"")})}>Enregistrer la réponse</Button>
      {Object.prototype.hasOwnProperty.call(state.answers,key)&&<p>Dernière réponse enregistrée : {Array.isArray(state.answers[key])?(state.answers[key] as string[]).join(" + "):String(state.answers[key])} · {statutPedagogique(source,state.answers[key])}</p>}
      <p>Corrigé actuel : {q.type==="QCM"?q.choix?.filter(c=>c.correct).map(c=>c.lettre).join(" + "):q.reponseQRC}</p>
      <p className="text-sm text-muted-foreground">La note et les réponses d’examen restent inchangées.</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={index===0||busy} onClick={()=>setIndex(i=>i-1)}>Précédente</Button>
        {index<state.sources.length-1?<Button variant="outline" disabled={busy} onClick={()=>setIndex(i=>i+1)}>Suivante</Button>:<Button disabled={busy||!!error} onClick={()=>void send({kind:"submit"})}>Terminer la révision</Button>}
      </div>
    </>}
  </section>;
}