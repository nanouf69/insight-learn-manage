import {useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Table,TableHeader,TableHead,TableRow,TableBody,TableCell} from '@/components/ui/table';
import {toast} from 'sonner';
import {FlaskConical} from 'lucide-react';
import {simulerConvocationFc,type SessionFcConvocation,type InscriptionFcConvocation,type StagiaireFcConvocation} from '../../../supabase/functions/_shared/fcConvocationsRegles';
type Ligne={id:string;nom:string;session:string;motif:string};
export function ConvocationsFcSimulation(){
  const [rows,setRows]=useState<Ligne[]|null>(null),[busy,setBusy]=useState(false);
  const simuler=async()=>{
    setBusy(true);
    try{
      const depuis=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Paris'});
      const sessions=await supabase.from('sessions').select('id,nom,date_debut,date_fin,lieu,heure_debut,heure_fin,statut').ilike('nom','%formation%continue%').gte('date_debut',depuis).order('date_debut');
      if(sessions.error) throw sessions.error;
      const result:Ligne[]=[];
      for(const s of sessions.data??[]){
        for(let from=0;;from+=200){
          const links=await supabase.from('session_apprenants').select('id,apprenant_id,session_id,liste_attente,montant_total,date_debut,date_fin,date_fin_personnalisee,heure_debut_personnalisee,heure_fin_personnalisee,apprenants(id,nom,prenom,email,emails_bloques,deleted_at,abandonnee)').eq('session_id',s.id).order('id').range(from,from+199);
          if(links.error) throw links.error;
          for(const raw of links.data??[]){
            const a=raw.apprenants as unknown as StagiaireFcConvocation|null;
            if(!a) throw new Error('Stagiaire non lisible');
            const r=simulerConvocationFc({session:s as SessionFcConvocation,inscription:raw as InscriptionFcConvocation,stagiaire:a,virements:[],preuves:[],depuis:null,aujourdHui:depuis});
            result.push({id:raw.id,nom:`${a.nom} ${a.prenom}`,session:s.nom,motif:r.motif});
          }
          if((links.data?.length??0)<200) break;
        }
      }
      setRows(result);
    }catch{toast.error('Simulation impossible : aucune décision ni aucun envoi effectué');}
    finally{setBusy(false);}
  };
  return <section className="my-6 border-y py-4 space-y-3">
    <div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">Convocations FC TAXI / VTC</h3><Badge variant="secondary">Envois désactivés</Badge><Button variant="outline" size="sm" disabled={busy} onClick={simuler}><FlaskConical className="h-4 w-4 mr-2"/>{busy?'Simulation…':'Simuler sans envoyer'}</Button></div>
    {rows&&<div className="overflow-auto"><Table><TableHeader><TableRow><TableHead>Stagiaire</TableHead><TableHead>Session</TableHead><TableHead>Décision</TableHead></TableRow></TableHeader><TableBody>{rows.map(r=><TableRow key={r.id}><TableCell>{r.nom}</TableCell><TableCell>{r.session}</TableCell><TableCell>{r.motif}</TableCell></TableRow>)}</TableBody></Table>{rows.length===0&&<p className="text-sm text-muted-foreground">Aucune inscription FC à venir.</p>}</div>}
  </section>;
}