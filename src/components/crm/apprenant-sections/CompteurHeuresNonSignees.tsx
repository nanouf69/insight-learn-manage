import { useQuery } from '@tanstack/react-query';
import { chargerSignaturesManquantes, dateDuJourParis, type SignatureManquante } from '@/lib/signaturesManquantes';
import { heuresRestantSigner, formatMinutesPresence } from '@/lib/heuresRestantSigner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { chargerTauxPresenceHeures } from '@/components/crm/TauxPresenceSessionsCard';
import { ValidationPresenceCreneauDialog, type CiblePresenceCreneau } from './ValidationPresenceCreneauDialog';

export function DetailHeuresNonSignees({ rows, apprenantId }: { rows: readonly SignatureManquante[]; apprenantId?: string }) {
  const [cible,setCible]=useState<CiblePresenceCreneau|null>(null);
  const pratique=useQuery({queryKey:['presence-pratique-preuve',apprenantId],queryFn:()=>chargerTauxPresenceHeures(apprenantId ?? ''),enabled:!!apprenantId,retry:false});
  const ouvrir=async(c:CiblePresenceCreneau)=>{
    if(!apprenantId)return;
    try{
      const {data,error}=await supabase.auth.getUser();const uid=data?.user?.id;
      if(error||!uid)throw new Error('session');
      const role=await supabase.from('user_roles').select('role').eq('user_id',uid).eq('role','admin').maybeSingle();
      if(role.error||!role.data)throw new Error('admin');
      const declarations=await supabase.from('presentiel_heures_validees').select('id,date_presence,heures').eq('apprenant_id',apprenantId);
      if(declarations.error)throw declarations.error;
      setCible({...c,conflit:(declarations.data ?? []).some(v=>v.date_presence===c.date&&Number(v.heures)>0)});
    }catch{toast.error('Accès administrateur et lecture des preuves requis : aucune présence modifiée');}
  };
  const bilan = heuresRestantSigner(rows, dateDuJourParis());
  const fmt = (minutes: number | null) => minutes == null ? 'À vérifier — durée non prouvée' : formatMinutesPresence(minutes);
  return <section aria-label="Heures non signées" className="space-y-3 border-y py-4">
    <div><h3 className="text-sm font-semibold">Nombre d’heures restant à signer</h3><p className="text-2xl font-bold text-foreground">{fmt(bilan.minutes)}</p></div>
    <ul className="divide-y">{bilan.details.map(r => <li className="py-2 text-sm break-words flex flex-wrap items-center gap-2" key={`${r.date}|${r.creneau}`}><span>{r.date.split('-').reverse().join('/')} — {r.horaires ?? r.creneau} — <strong>{fmt(r.minutes)}</strong></span>{apprenantId&&<Button size="sm" variant="outline" className="h-auto whitespace-normal text-left" disabled={r.minutes==null||bilan.conflit} onClick={()=>void ouvrir({...r,pratique:/pratique/i.test(r.source)})}>Valider manuellement la présence</Button>}</li>)}</ul>
    <div><h3 className="text-sm font-semibold">Heures de présence à justifier / régulariser</h3><p className="text-lg font-bold">{fmt(bilan.minutesAJustifier)}</p>
      <p className="text-sm text-muted-foreground">Créneaux sans signature ni preuve de présence liée précisément au créneau. Les validations administratives sans créneau ne réduisent pas ce montant ; elles ne remplacent jamais une signature.</p></div>
    {apprenantId&&<div className="border-t pt-3 space-y-2"><h3 className="font-semibold">PRATIQUE — {pratique.data ? `${formatMinutesPresence(Math.round(pratique.data.pratique.faites*60))}/6h` : 'lecture en cours'}</h3>
      <p className="text-sm text-muted-foreground">{pratique.isError?'Lecture impossible : présence non vérifiée.':pratique.data?.pratique.prevues ? `${pratique.data.pratique.prevues} h de session inscrite.`:'Aucune session pratique inscrite confirmée : rattacher la vraie séance ou faire vérifier une preuve administrative.'} La cible 6 h reste à confirmer au contrat ; aucun supplément ajouté au total.</p>
      <Button variant="outline" size="sm" onClick={()=>void ouvrir({pratique:true})}>Valider une durée pratique</Button></div>}
    <ValidationPresenceCreneauDialog cible={cible} onClose={()=>setCible(null)}/>
  </section>;
}
export function CompteurHeuresNonSignees({ apprenantId }: { apprenantId: string }) {
  const q = useQuery({ queryKey:['relance-signatures-manquantes',apprenantId,'heures'], queryFn:()=>chargerSignaturesManquantes(apprenantId), retry:false });
  if (q.isError) return <p role="alert" className="text-destructive">Heures non signées indisponibles : lecture impossible.</p>;
  if (!q.data || q.isFetching) return <p className="text-muted-foreground">Lecture des heures non signées…</p>;
  return <DetailHeuresNonSignees rows={q.data} apprenantId={apprenantId}/>;
}