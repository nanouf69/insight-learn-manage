import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { dureePratiqueSchema } from '@/lib/presenceCreneau';
import { formatMinutesPresence } from '@/lib/heuresRestantSigner';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows';
import { retrouverInscriptionPresence, verifierPdfPresence } from '@/lib/presenceJustificatif';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export interface CiblePresenceCreneau { date?: string; creneau?: string; horaires?: string; minutes?: number | null; pratique: boolean; conflit?: boolean; apprenantId?: string }
export function ValidationPresenceCreneauDialog({cible,onClose}:{cible:CiblePresenceCreneau|null;onClose:()=>void}) {
  const [formateur,setFormateur]=useState('');const [autreFormateur,setAutreFormateur]=useState('');const [preuve,setPreuve]=useState('');const [libelle,setLibelle]=useState('');
  const [formateurs,setFormateurs]=useState<{id:string;nom:string;prenom:string}[]>([]);const [rattachement,setRattachement]=useState('');const [pdf,setPdf]=useState<File|null>(null);const [pdfErreur,setPdfErreur]=useState('');
  const [date,setDate]=useState('');const [duree,setDuree]=useState('');const [confirme,setConfirme]=useState(false);
  useEffect(()=>{
    let alive=true;setFormateur('');setAutreFormateur('');setPreuve('');setLibelle('');setPdf(null);setPdfErreur('');setFormateurs([]);setDate(cible?.date ?? '');setDuree(cible?.minutes != null ? String(cible.minutes/60) : '0');setConfirme(false);setRattachement('Vérification de l’inscription…');
    if(!cible)return ()=>{alive=false;};
    const load=async()=>{
      try{
        if(!cible.apprenantId)throw new Error('Identité du candidat non disponible : rattachement impossible.');
        const {data,error}=await supabase.auth.getUser();const uid=data?.user?.id;if(error||!uid)throw new Error('Session administrateur requise.');
        const role=await supabase.from('user_roles').select('role').eq('user_id',uid).eq('role','admin').maybeSingle();if(role.error||!role.data)throw new Error('Accès administrateur requis.');
        const [ins,fs,eleve]=await Promise.all([
          fetchAllRows<any>((a,b)=>supabase.from('session_apprenants').select('*,sessions:session_id(*)').eq('apprenant_id',cible.apprenantId ?? '').order('id').range(a,b)),
          fetchAllRows<any>((a,b)=>supabase.from('formateurs').select('id,nom,prenom').order('id').range(a,b)),
          supabase.from('apprenants').select('type_apprenant').eq('id',cible.apprenantId).single()
        ]);
        if(eleve.error)throw eleve.error;
        const lien=retrouverInscriptionPresence(ins,cible,String(eleve.data?.type_apprenant ?? ''));
        let selection=fs;
        if(lien.inscription){
          const sf=await supabase.from('session_formateurs').select('formateur_id').eq('session_id',lien.inscription.session_id);
          if(sf.error)throw sf.error;
          const ids=new Set((sf.data ?? []).map(x=>x.formateur_id));if(ids.size)selection=fs.filter(x=>ids.has(x.id));
        }
        if(alive){setFormateurs(selection);if(selection.length===1)setFormateur(selection[0].id);setRattachement(lien.inscription?'Inscription retrouvée automatiquement ; vérification serveur finale requise.':lien.message);}
      }catch(e){if(alive)setRattachement(e instanceof Error?e.message:'Lecture impossible : aucune validation autorisée.');}
    };void load();return()=>{alive=false;};
  },[cible]);
  const parsed=dureePratiqueSchema.safeParse(duree.replace(',','.'));
  return <Dialog open={!!cible} onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{cible?.pratique?'Valider la présence pratique':'Valider manuellement la présence'}</DialogTitle></DialogHeader>
    <p className="text-sm">{cible?.date?.split('-').reverse().join('/') ?? 'Date à vérifier'} — {cible?.horaires ?? 'Créneau pratique à rattacher'} {cible?.minutes != null ? `— ${formatMinutesPresence(cible.minutes)}` : ''}</p>
    {cible?.conflit&&<p role="alert" className="text-sm text-destructive">Une validation sans créneau précis existe ce jour : rapprochement requis, aucune heure supplémentaire comptée automatiquement.</p>}
    <p role="status" className="text-sm text-muted-foreground">{rattachement}</p>
    <label className="text-sm">Formateur présent<Select value={formateur} onValueChange={setFormateur}><SelectTrigger aria-label="Formateur présent"><SelectValue placeholder="Choisir un formateur"/></SelectTrigger><SelectContent>{formateurs.map(f=><SelectItem key={f.id} value={f.id}>{f.prenom} {f.nom}</SelectItem>)}<SelectItem value="autre">Autre formateur</SelectItem></SelectContent></Select></label>
    {formateur==='autre'&&<label className="text-sm">Nom de l’autre formateur<Input aria-label="Nom de l’autre formateur" value={autreFormateur} onChange={e=>setAutreFormateur(e.target.value)} maxLength={100}/></label>}
    <label className="text-sm">Date de la séance<Input aria-label="Date de la séance" type="date" value={date} onChange={e=>setDate(e.target.value)} readOnly={!!cible?.date}/></label>
    {cible?.pratique&&<label className="text-sm">Durée pratique vérifiée (0 à 6 h)<Input aria-label="Durée pratique vérifiée" type="number" min="0" max="6" step="0.5" value={duree} onChange={e=>setDuree(e.target.value)}/></label>}
    {cible?.pratique&&!parsed.success&&<p role="alert" className="text-destructive text-sm">Durée requise entre 0 et 6 h, en minutes entières.</p>}
    <label className="text-sm">Justificatif de présence<Select value={preuve} onValueChange={setPreuve}><SelectTrigger aria-label="Justificatif de présence"><SelectValue placeholder="Choisir un justificatif"/></SelectTrigger><SelectContent><SelectItem value="feuille">Feuille d’émargement</SelectItem><SelectItem value="attestation">Attestation de fin de formation</SelectItem><SelectItem value="autre">Autre justificatif</SelectItem></SelectContent></Select></label>
    {preuve==='autre'&&<label className="text-sm">Libellé du justificatif<Input aria-label="Libellé du justificatif" value={libelle} onChange={e=>setLibelle(e.target.value)} maxLength={200}/></label>}
    {preuve==='attestation'&&<p className="text-sm text-destructive">Une attestation de fin de formation ne prouve pas à elle seule la présence sur ce créneau précis.</p>}
    <label className="text-sm">Joindre un PDF (facultatif, 4 Mo maximum)<Input key={`${cible?.date}-${cible?.creneau}`} aria-label="Joindre un PDF" type="file" accept="application/pdf,.pdf" onChange={async e=>{const f=e.target.files?.[0];setPdf(null);setPdfErreur('');if(!f)return;try{await verifierPdfPresence(f);setPdf(f);}catch(err){setPdfErreur(err instanceof Error?err.message:'PDF invalide');}}}/></label>
    {pdf&&<p className="text-sm break-words">{pdf.name} — sélectionné localement, non déposé au dossier.</p>}
    {pdfErreur&&<p role="alert" className="text-sm text-destructive">{pdfErreur}</p>}
    <label className="flex items-start gap-2 text-sm"><Checkbox checked={confirme} onCheckedChange={v=>setConfirme(v===true)}/>Je confirme le déroulement réel, l’identité du candidat et la preuve de présence.</label>
    <p className="text-sm">Présence validée administrativement — signature apprenant absente. Aucune signature ni absence ne sera remplacée ; la date de validation sera celle du serveur.</p>
    <p role="status" className="text-sm text-destructive">Validation indisponible : ce formulaire ne peut pas enregistrer de présence. Le dépôt PDF privé et le journal de validation ne sont pas installés. Le fichier sélectionné reste sur cet appareil ; fermer cette fenêtre ne valide aucune heure.</p>
    <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Fermer</Button><Button disabled>Confirmer la présence</Button></DialogFooter>
  </DialogContent></Dialog>;
}