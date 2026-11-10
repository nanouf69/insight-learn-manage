import {useEffect,useState} from "react";
import {supabase} from "@/integrations/supabase/client";

type Copie = {id:string;apprenant_id:string;quiz_id:string;matiere_nom:string;tentative:number|null;completed_at:string;details:any};
/** Historique consultable dans le correcteur unique, sans ancien écran de notation. */
export function CopiesHistoriquesLecture({resultIds}: {resultIds:string[]}) {
  const [state,setState]=useState<{rows:Copie[];names:Record<string,string>;error:boolean;loading:boolean}>({rows:[],names:{},error:false,loading:true});
  const identity=JSON.stringify(resultIds);
  useEffect(()=>{
    let cancelled=false;
    setState({rows:[],names:{},error:false,loading:true});
    void (async()=>{
      try {
        const rows:Copie[]=[];
        for(let i=0;i<resultIds.length;i+=100){
          const {data,error}=await supabase.from("apprenant_quiz_results").select("id,apprenant_id,quiz_id,matiere_nom,tentative,completed_at,details").in("id",resultIds.slice(i,i+100)).order("id");
          if(error) throw error;
          rows.push(...(data as Copie[] ?? []));
        }
        if(new Set(rows.map(r=>r.id)).size!==new Set(resultIds).size) throw new Error("Copie non relue");
        const ids=[...new Set(rows.map(r=>r.apprenant_id))],names:Record<string,string>={};
        for(let i=0;i<ids.length;i+=100){const {data,error}=await supabase.from("apprenants").select("id,nom,prenom").in("id",ids.slice(i,i+100));if(error) throw error;for(const a of data??[]) names[a.id]=`${a.nom} ${a.prenom}`;}
        rows.sort((a,b)=>Date.parse(b.completed_at)-Date.parse(a.completed_at)||a.id.localeCompare(b.id));
        if(!cancelled)setState({rows,names,error:false,loading:false});
      }catch{if(!cancelled)setState({rows:[],names:{},error:true,loading:false});}
    })();
    return()=>{cancelled=true;};
  },[identity]);
  return <section aria-label="Copies historiques — consultation" className="space-y-4">
    <h2 className="font-semibold text-lg">Copies historiques — consultation</h2>
    <p className="text-destructive font-semibold">À VÉRIFIER — notation indisponible sans preuve serveur du barème et de la copie.</p>
    {state.error&&<p role="alert" className="text-destructive">Lecture incomplète : impossible de confirmer les copies attendues.</p>}
    {state.loading&&<p>Lecture en cours…</p>}
    {state.rows.map(r=><article key={r.id} className="border-b pb-4 space-y-2 break-words">
      <h3 className="font-semibold"><a className="text-primary underline" href={`/?section=crm&apprenant=${encodeURIComponent(r.apprenant_id)}`} target="_blank" rel="noopener noreferrer">{state.names[r.apprenant_id]??"Nom non disponible"}</a> · {r.quiz_id} · {r.matiere_nom} · Tentative {r.tentative??"À VÉRIFIER"}</h3>
      <p className="text-sm text-muted-foreground">Fin enregistrée : {new Date(r.completed_at).toLocaleString("fr-FR",{timeZone:"Europe/Paris"})}</p>
      {Object.entries(r.details?.reponses??{}).filter(([,v])=>typeof v==="string"&&v.trim()).map(([id,answer])=>{
        const questions=r.details?.snapshot?.questions;
        const candidates=Array.isArray(questions)?questions.filter((q:any)=>String(q.id)===id):[];
        const q=candidates.length===1?candidates[0]:null;
        return <div key={id} className="space-y-1"><p className="font-medium">Q{id} — {q?.enonce??"Énoncé figé non prouvé"}</p><p className="whitespace-pre-wrap">{String(answer)}</p><p className="text-warning text-sm">Correction humaine non attestée dans cette consultation.</p></div>;
      })}
    </article>)}
  </section>;
}