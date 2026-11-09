import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { chargerPreuvesPapier } from '@/lib/fcSignaturesPapier';

export function SignaturesPapierFC({ inscriptions, sessionId }: { inscriptions: any[]; sessionId: string }) {
  const [id, setId] = useState('');
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">Signatures papier</h2>
    <Label>Apprenant</Label>
    <Select value={id} onValueChange={setId}><SelectTrigger><SelectValue placeholder="Choisir un apprenant" /></SelectTrigger><SelectContent>{inscriptions.filter(s=>s.apprenant).map(s=><SelectItem key={s.id} value={s.id}>{s.apprenant.prenom} {s.apprenant.nom}</SelectItem>)}</SelectContent></Select>
    {id && <DossierPapier key={id} inscription={inscriptions.find(s=>s.id===id)} sessionId={sessionId} />}
  </section>;
}
function DossierPapier({ inscription, sessionId }: { inscription: any; sessionId: string }) {
  const [doc, setDoc] = useState(''), [date,setDate]=useState(''), [creneau,setCreneau]=useState('matin'), [heures,setHeures]=useState(''), [confirme,setConfirme]=useState(false), [busy,setBusy]=useState(false);
  const client=useQueryClient(), {toast}=useToast();
  const ap=inscription.apprenant;
  const documents=useQuery({queryKey:['fc-papier-documents',ap.id],queryFn:async()=>{
    const {data,error}=await supabase.from('documents_inscription').select('id,titre,nom_fichier,url').eq('apprenant_id',ap.id).order('created_at',{ascending:false});
    if(error) throw error; return data ?? [];
  }});
  const preuves=useQuery({queryKey:['fc-papier',ap.id],queryFn:()=>chargerPreuvesPapier(ap.id),retry:false});
  const save=async()=>{
    if(busy || !confirme) return; setBusy(true);
    try {
      const {data:auth,error:authError}=await supabase.auth.getUser(); if(authError || !auth.user) throw new Error('Reconnectez-vous.');
      const {data,error}=await (supabase as any).from('fc_signatures_papier').insert({inscription_id:inscription.id,session_id:sessionId,apprenant_id:ap.id,document_id:doc,date_presence:date,creneau,heures:Number(heures),created_by:auth.user.id}).select('id').single();
      if(error || !data?.id) throw error ?? new Error('Enregistrement non confirmé');
      await preuves.refetch();
      await client.invalidateQueries({predicate:q=>!q.queryKey.includes('fc-papier-documents')});
      toast({title:'Signature papier enregistrée'}); setConfirme(false);
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
    <Label htmlFor="papier-date">Date de présence</Label><Input id="papier-date" type="date" value={date} onChange={e=>setDate(e.target.value)} />
    <Label>Créneau signé</Label><Select value={creneau} onValueChange={setCreneau}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="matin">Matin</SelectItem><SelectItem value="apres_midi">Après-midi</SelectItem></SelectContent></Select>
    <Label htmlFor="papier-heures">Nombre d’heures signées pour ce créneau</Label><Input id="papier-heures" type="number" min="0.25" max="4" step="0.25" value={heures} onChange={e=>setHeures(e.target.value)} />
    <label className="flex items-start gap-2"><Checkbox checked={confirme} onCheckedChange={v=>setConfirme(v===true)} /><span>J’ai vérifié sur la feuille la signature de cet apprenant, la date, le créneau et les heures indiquées.</span></label>
    <Button disabled={busy || !confirme || !doc || !date || Number(heures)<=0} onClick={save}><Save className="mr-2 h-4 w-4" />Enregistrer le créneau signé</Button>
    {documents.isError || preuves.isError ? <p role="alert" className="text-destructive">Lecture des preuves indisponible.</p> : preuves.data?.filter(p=>p.session_id===sessionId).map(p=><p key={p.id} className="text-sm">{p.date_emargement} · {p.demi_journee==='matin'?'Matin':'Après-midi'} · {p.heures} h · Papier</p>)}
  </div>;
}