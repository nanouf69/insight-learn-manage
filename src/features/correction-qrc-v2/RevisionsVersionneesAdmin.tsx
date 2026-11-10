import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
type Row={session_id:string;owner_id:string;refs:{type:string;id:string;question:string}[];answers:{key:string;answer:unknown;saved_at:string;seq:number}[]};
export function RevisionsVersionneesAdmin({owner}:{owner:string}) {
  const [rows,setRows]=useState<Row[]>([]);
  const [error,setError]=useState<string|null>(null);
  const load=useCallback(async()=>{
    try{
      const all:Row[]=[];let after:string|null=null;
      for(;;){
        const {data,error:err}=await supabase.rpc("revision_corrige_admin" as never,{p_owner:owner,p_after:after} as never);
        if(err)throw err;
        const page=data as unknown as Row[];
        if(!Array.isArray(page)||page.some(r=>r.owner_id!==owner))throw new Error("Identité non confirmée");
        all.push(...page);
        if(page.length<50)break;
        const next=page.at(-1)?.session_id;
        if(!next||next===after)throw new Error("Pagination non confirmée");
        after=next;
      }
      setRows(all);setError(null);
    }catch{setRows([]);setError("Lecture des révisions versionnées non confirmée.");}
  },[owner]);
  useEffect(()=>{void load();window.addEventListener("focus",load);return()=>window.removeEventListener("focus",load);},[load]);
  return <section className="space-y-3 border-t pt-4"><h3 className="font-semibold">Révisions avec corrigé versionné</h3>
    <Button variant="outline" onClick={()=>void load()}>Relire les dernières réponses</Button>
    {error&&<p role="alert" className="text-destructive">{error}</p>}
    {rows.flatMap(s=>s.answers.map(a=><article key={`${s.session_id}|${a.key}`} className="border-b pb-3 break-words">
      <p>{a.key} · Révision {s.session_id}</p>
      <p>Dernière réponse enregistrée : {Array.isArray(a.answer)?a.answer.join(" + "):String(a.answer)}</p>
      <p className="text-muted-foreground text-sm">Enregistrée le {new Date(a.saved_at).toLocaleString("fr-FR",{timeZone:"Europe/Paris"})} · Version de sauvegarde {a.seq}</p>
    </article>))}
  </section>;
}