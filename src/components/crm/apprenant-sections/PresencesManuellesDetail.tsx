import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows';
import { lirePresencesAdministratives } from '@/lib/heuresValideesAdmin';
import { BUCKET_JUSTIFICATIFS_PRESENCE, dureeLisible } from '@/lib/presenceCreneauTransport';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/** Admin-only private evidence; never exposes storage paths to the learner. */
export function PresencesManuellesDetail({apprenantId}:{apprenantId:string}) {
  const {data,isError} = useQuery({queryKey:['presence-manuelle-detail',apprenantId],queryFn:async()=>{
    const [liens,rows,profiles] = await Promise.all([
      fetchAllRows<any>((a,z)=>supabase.from('presentiel_presence_creneaux' as any).select('*').eq('apprenant_id',apprenantId).order('id').range(a,z)),
      lirePresencesAdministratives(apprenantId,true),
      fetchAllRows<any>((a,z)=>supabase.from('profiles').select('id,full_name').order('id').range(a,z)),
    ]);
    return liens.map(l=>({...l,annulee:rows.find(r=>r.id===l.validation_id)?.annulee===true,auteurNom:profiles.find(p=>p.id===l.auteur)?.full_name || 'Administrateur — nom indisponible'}));
  }});
  const preuve=async(chemin:string)=>{
    const tab=window.open('','_blank');
    const {data,error}=await supabase.storage.from(BUCKET_JUSTIFICATIFS_PRESENCE).createSignedUrl(chemin,300);
    if(error || !data?.signedUrl){tab?.close();toast.error('Lecture du justificatif refusée ou indisponible.');return;}
    if(tab){tab.opener=null;tab.location.href=data.signedUrl;}
  };
  if(isError)return <p role="alert" className="text-sm text-destructive">Détail des validations manuelles indisponible.</p>;
  return <div className="w-full space-y-2">
    {data?.map(l=><div key={l.id} className="border-t border-border py-2 text-sm space-y-1">
      <p className="font-medium">{l.date_presence.split('-').reverse().join('/')} · {l.debut.slice(0,5)}–{l.fin.slice(0,5)} · {dureeLisible(l.minutes)}</p>
      <p>Auteur : {l.auteurNom} · Statut : {l.annulee?'Annulée — non comptée':'Validée'}</p>
      <p>Preuve : {l.justificatif==='feuille'?"Feuille d’émargement":l.justificatif==='attestation'?'Attestation':l.justificatif_libelle || 'Autre justificatif'}</p>
      <Button variant="outline" size="sm" onClick={()=>void preuve(l.pdf_chemin)}>Voir le justificatif PDF</Button>
    </div>)}
    {data?.length===0&&<p className="text-sm text-muted-foreground">Aucun créneau avec justificatif enregistré.</p>}
  </div>;
}