import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { chargerPreuvesPapier } from '@/lib/fcSignaturesPapier';
import { fcPapierSlots } from '@/lib/fcPapierSlots';

export function SignaturesPapierFC({ inscriptions, sessionId, initialInscriptionId = '' }: { inscriptions: any[]; sessionId: string; initialInscriptionId?: string }) {
  const [id, setId] = useState(initialInscriptionId);
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">Signatures papier</h2>
    <Label>Apprenant</Label>
    <Select value={id} onValueChange={setId}><SelectTrigger><SelectValue placeholder="Choisir un apprenant" /></SelectTrigger><SelectContent>{inscriptions.filter(s=>s.apprenant).map(s=><SelectItem key={s.id} value={s.id}>{s.apprenant.prenom} {s.apprenant.nom}</SelectItem>)}</SelectContent></Select>
    {id && <DossierPapier key={id} inscription={inscriptions.find(s=>s.id===id)} sessionId={sessionId} />}
  </section>;
}
function DossierPapier({ inscription, sessionId }: { inscription: any; sessionId: string }) {
  const [doc, setDoc] = useState(''), [selection,setSelection]=useState<string[]>([]), [busy,setBusy]=useState(false);
  const client=useQueryClient(), {toast}=useToast();
  const ap=inscription.apprenant;
  const documents=useQuery({queryKey:['fc-papier-documents',ap.id],queryFn:async()=>{
    const {data,error}=await supabase.from('documents_inscription').select('id,titre,nom_fichier,url').eq('apprenant_id',ap.id).order('created_at',{ascending:false});
    if(error) throw error; return data ?? [];
  }});
  const preuves=useQuery({queryKey:['fc-papier',ap.id],queryFn:()=>chargerPreuvesPapier(ap.id),retry:false});
  const session = useQuery({queryKey:['fc-papier-session',sessionId],queryFn:async()=>{
    const {data,error}=await supabase.from('sessions').select('date_debut,date_fin').eq('id',sessionId).single();
    if(error) throw error; return data;
  },retry:false});
  const slots=fcPapierSlots(session.data?.date_debut ?? '',session.data?.date_fin ?? '');
  const existing=new Set((preuves.data ?? []).filter(p=>p.session_id===sessionId).map(p=>`${p.date_emargement}|${p.demi_journee}`));
  const save=async()=>{
    if(busy || !doc || !selection.length || preuves.isError || session.isError) return; setBusy(true);
    try {
      const {data:auth,error:authError}=await supabase.auth.getUser(); if(authError || !auth.user) throw new Error('Reconnectez-vous.');
      const fresh=await chargerPreuvesPapier(ap.id);
      const saved=new Set(fresh.filter(p=>p.session_id===sessionId).map(p=>`${p.date_emargement}|${p.demi_journee}`));
      const selected=slots.filter(s=>selection.includes(s.key));
      const pending=selected.filter(s=>!saved.has(s.key));
      if(pending.length){
        const {data,error}=await (supabase as any).from('fc_signatures_papier').insert(pending.map(s=>({inscription_id:inscription.id,session_id:sessionId,apprenant_id:ap.id,document_id:doc,date_presence:s.date,creneau:s.creneau,heures:s.heures,created_by:auth.user.id}))).select('id');
        if(error || data?.length!==pending.length) throw error ?? new Error('Enregistrement non confirmé');
      }
      const confirmed=await preuves.refetch();
      if(confirmed.error || selected.some(s=>!confirmed.data?.some(p=>p.session_id===sessionId && p.date_emargement===s.date && p.demi_journee===s.creneau && Number(p.heures)===s.heures))) throw new Error('Relecture non confirmée : actualisez avant de réessayer.');
      const keys=['emargements-hours','fc-controles-papier','relance-signatures-manquantes','apprenant-signatures-manquantes','apprenant-bilan-signatures-edof','apprenant-documents-completes','apprenant-presence-heures'];
      await Promise.all(keys.map(key=>client.invalidateQueries({queryKey:[key]})));
      toast({title:'Créneaux papier enregistrés'}); setSelection([]);
    }catch(e){toast({title:'Enregistrement refusé',description:e instanceof Error?e.message:'Vérifiez le créneau, les heures et le document.',variant:'destructive'});}finally{setBusy(false);}
  };
  const view=async()=>{
    const d=documents.data?.find(d=>d.id===doc); if(!d?.url) return;
    const win=window.open('','_blank'); const path=d.url.split('/documents-inscription/').at(-1) ?? d.url;
    const {data,error}=await supabase.storage.from('documents-inscription').createSignedUrl(path,300);
    if(error || !data?.signedUrl){win?.close();return;} if(win) win.location.href=data.signedUrl;
  };
  return <div className="space-y-4 max-w-2xl">
    <Label>Feuille signée dans le dossier</Label><Select value={doc} onValueChange={setDoc}><SelectTrigger><SelectValue placeholder="Choisir la feuille signée" /></SelectTrigger><SelectContent>{documents.data?.filter(d=>d.url).map(d=><SelectItem key={d.id} value={d.id}>{d.titre || d.nom_fichier}</SelectItem>)}</SelectContent></Select>
    <Button variant="outline" disabled={!doc} onClick={view}><Eye className="mr-2 h-4 w-4" />Consulter la feuille</Button>
    <div className="divide-y border-y" aria-label="Créneaux de signature papier">{slots.map(s=><label key={s.key} className="flex items-center gap-3 py-4">
      <Checkbox disabled={busy || existing.has(s.key) || s.date>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(new Date())} checked={existing.has(s.key) || selection.includes(s.key)} onCheckedChange={v=>setSelection(prev=>v===true?[...prev,s.key]:prev.filter(k=>k!==s.key))} />
      <span className="flex-1">{s.date.split('-').reverse().join('/')} — {s.creneau==='matin'?'Matin':'Après-midi'}<span className="block text-sm text-muted-foreground">{s.heures} h · {existing.has(s.key)?'Papier enregistré':'Signature papier vérifiée'}</span></span>
    </label>)}</div>
    <p className="text-sm font-semibold">Heures sélectionnées : {slots.filter(s=>selection.includes(s.key)).reduce((total,s)=>total+s.heures,0)} h</p>
    <Button disabled={busy || !doc || !selection.length || preuves.isPending || preuves.isError || session.isError} onClick={save}><Save className="mr-2 h-4 w-4" />Enregistrer les créneaux cochés</Button>
    {documents.isError || preuves.isError ? <p role="alert" className="text-destructive">Lecture des preuves indisponible.</p> : preuves.data?.filter(p=>p.session_id===sessionId).map(p=><p key={p.id} className="text-sm">{p.date_emargement} · {p.demi_journee==='matin'?'Matin':'Après-midi'} · {p.heures} h · Papier</p>)}
  </div>;
}