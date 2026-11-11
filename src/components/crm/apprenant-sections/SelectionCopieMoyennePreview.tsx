import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { lireResultatsQuizEleve } from '@/lib/learnerQuizResultsRead';
import { fetchCoreMatiereStates } from '@/lib/coreExamPublication';
import { fetchPassagesV2NonFiables } from '@/lib/passagesV2NonFiables';
import { attacherSourceUnique, noteExamenAffichee } from '@/lib/noteExamenAffichee';
import { simulateCopySelection } from '@/lib/ebCopySelectionPreview';
import type { ExamenBlanc } from '@/components/cours-en-ligne/examens-blancs-data';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function SelectionCopieMoyennePreview({account,nom,exam}:{account:string;nom:string;exam:ExamenBlanc}) {
  const [open,setOpen] = useState(false), [subject,setSubject] = useState(''), [id,setId] = useState('');
  const role = useQuery({queryKey:['copy-selection-admin'],retry:false,queryFn:async()=>{
    const {data,error}=await supabase.auth.getUser(); if(error || !data.user) return false;
    const r=await supabase.rpc('has_role',{_user_id:data.user.id,_role:'admin'}); return !r.error && r.data===true;
  }});
  const read = useQuery({queryKey:['copy-selection-preview',account,exam.id],enabled:open && role.data===true,retry:false,queryFn:async()=>{
    const [r,core,resets]=await Promise.all([lireResultatsQuizEleve(account,exam.id,'examen_blanc'),fetchCoreMatiereStates(account),supabase.from('core_exam_resets').select('exam_id,cutoff_at').eq('apprenant_id',account)]);
    if(r.error || resets.error || core===null) throw new Error('Lecture officielle indisponible.');
    const nonFiables=await fetchPassagesV2NonFiables(new Map([[account,core]]));
    if(nonFiables===null) throw new Error('Preuves indisponibles.');
    return {rows:r.data??[],core,nonFiables,resets:resets.data??[]};
  }});
  if(role.data!==true) return null;
  const candidates=read.data?.rows.filter(r=>r.matiere_id===subject)??[];
  let result:ReturnType<typeof simulateCopySelection>|null=null, error='';
  if(id && read.data) try {result=simulateCopySelection(account,exam,read.data.rows,read.data.resets,read.data.core,read.data.nonFiables,id);} catch(e) {error=e instanceof Error?e.message:'Simulation refusée.';}
  return <>
    <Button variant="outline" size="sm" className="h-auto whitespace-normal" onClick={()=>{setOpen(true);setSubject('');setId('');}}>Simuler une copie retenue pour la moyenne</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{nom} · {exam.titre ?? exam.id}</DialogTitle><DialogDescription>Préparation uniquement — aucun changement enregistré. La dernière tentative reste retenue.</DialogDescription></DialogHeader>
      {read.isLoading && <p role="status">Lecture des copies officielles…</p>}{read.isError && <p role="alert">Lecture indisponible : aucune sélection possible.</p>}
      <Label htmlFor="selection-moyenne-matiere">Matière</Label><select id="selection-moyenne-matiere" className="w-full border border-input rounded-md bg-background p-3" value={subject} onChange={e=>{setSubject(e.target.value);setId('');}}><option value="">Choisir une matière</option>{exam.matieres.map(m=><option key={m.id} value={m.id}>{m.nom}</option>)}</select>
      <Label htmlFor="selection-moyenne-copie">Copie remise</Label><select id="selection-moyenne-copie" className="w-full border border-input rounded-md bg-background p-3" value={id} onChange={e=>setId(e.target.value)}><option value="">Choisir explicitement une copie</option>{candidates.map(r=>{
        const n=read.data?noteExamenAffichee(attacherSourceUnique(r,read.data.core,read.data.nonFiables)):null;
        return <option key={r.id} value={r.id} disabled={n?.etat!=='note'}>Tentative {r.tentative} · {new Date(r.completed_at).toLocaleString('fr-FR',{timeZone:'Europe/Paris'})} · {n?.note20??'Non vérifiée'}/20 · {r.id}</option>;
      })}</select>
      {error && <p role="alert">{error}</p>}{result && <section aria-label="Simulation de moyenne" className="space-y-2"><p className="font-semibold">Moyenne actuelle : {result.before.moyenne.toFixed(1)} / 20 → Simulation : {result.after.moyenne.toFixed(1)} / 20</p><p>{result.after.verdict==='reussi'?'Simulation : examen réussi, aucune note éliminatoire':`Simulation : ${result.after.verdict} ; matières éliminatoires : ${result.after.eliminatoires.join(', ')||'aucune'}`}</p><p className="text-sm">Coefficients : {exam.matieres.map(m=>`${m.nom.split(' - ')[0]} × ${m.coefficient||1}`).join(' · ')}. Total : {result.after.totalCoef}.</p><p className="text-xs text-muted-foreground break-all">Copie proposée : {result.chosen.id}. Toutes les autres copies restent conservées. Aucun effet sur les jalons.</p><Button disabled>Retenir cette copie — non activé</Button><p className="text-xs text-muted-foreground">Enregistrement indisponible : contrôle serveur et journal à préparer puis valider séparément.</p></section>}
      <Button variant="outline" onClick={()=>setOpen(false)}>Fermer sans enregistrer</Button>
    </DialogContent></Dialog>
  </>;
}