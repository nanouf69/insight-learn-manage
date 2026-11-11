import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, UnlockKeyhole, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { readSessionAccess, setSessionAccess, type ExamAccess, type SessionAccess } from './transport';

export function SessionExamAccess({sessionId,sessionName,examId,compact=false}:{sessionId:string;sessionName:string;examId?:string;compact?:boolean}) {
 const [context,setContext]=useState<SessionAccess|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [success,setSuccess]=useState('');
 const [confirmation,setConfirmation]=useState<{exam:ExamAccess;opened:boolean;op:string}|null>(null);
 const alive=useRef(0);const sending=useRef(false);
 const reload=async()=>{
  const seq=++alive.current;setLoading(true);setError('');
  try{const c=await readSessionAccess(sessionId);if(seq===alive.current)setContext(c);}
  catch(e){if(seq===alive.current){setContext(null);setError(e instanceof Error?e.message:'Lecture impossible.');}}
  finally{if(seq===alive.current)setLoading(false);}
 };
 useEffect(()=>{setContext(null);setConfirmation(null);setSuccess('');void reload();return()=>{alive.current++;};},[sessionId]);
 const confirm=async()=>{
  if(!context || !confirmation || sending.current)return;
  sending.current=true;setBusy(true);setError('');const seq=alive.current;
  try{
   const next=await setSessionAccess(context,confirmation.exam,confirmation.opened,confirmation.op);
   if(seq===alive.current){setContext(next);setSuccess(`${confirmation.exam.exam_id} : accès ${confirmation.opened?'ouvert':'fermé'}, confirmation enregistrée.`);setConfirmation(null);}
  }catch(e){if(seq===alive.current)setError(e instanceof Error?e.message:'Confirmation impossible.');}
  finally{sending.current=false;setBusy(false);}
 };
 return <section className="space-y-4 p-1 text-foreground">
  {!compact && <h3 className="text-lg font-semibold">Accès aux examens blancs</h3>}
  <p className="break-words font-medium">{sessionName}</p>
  {!compact && <><p className="text-sm text-muted-foreground">La fermeture concerne uniquement les nouveaux démarrages et les nouvelles tentatives de matière. Les épreuves commencées, leur chronomètre, les remises et les copies restent accessibles.</p>
  <p className="text-sm text-muted-foreground">Inscriptions croisées : seules les sessions correspondant au parcours autorisé sont prises en compte. Une fermeture explicite dans l’une de ces sessions reste prioritaire ; ouvrir ici ne lève pas la fermeture d’une autre session.</p></>}
  <Button variant="outline" size="sm" disabled={loading||busy} onClick={()=>void reload()}><RefreshCw className="mr-2 h-4 w-4"/>Relire les accès</Button>
  {loading && <p role="status">Lecture des accès…</p>}
  {error && <p role="alert" className="text-destructive">{error}</p>}
  {success && <p role="status">{success}</p>}
  {context && !loading && !context.exams.some(x=>!examId||x.exam_id===examId) && <p>Aucun examen blanc compatible n’est identifié pour cette session. Aucune modification possible.</p>}
  {context && !loading && context.exams.filter(x=>!examId||x.exam_id===examId).map(exam=><div key={exam.exam_id} className="flex flex-wrap items-center gap-3 border-b border-border py-3">
   <div className="min-w-0 flex-1"><strong>{exam.exam_id}</strong><p className="text-sm">{exam.opened===null?'Accès existants conservés — aucune consigne':exam.opened?'Ouvert aux élèves inscrits et éligibles':'Fermé aux nouveaux démarrages'}</p>
   {exam.changed_at && <p className="text-xs text-muted-foreground">Confirmation du {new Date(exam.changed_at).toLocaleString('fr-FR',{timeZone:'Europe/Paris'})}</p>}</div>
   <Button variant="outline" disabled={busy||exam.opened===true} onClick={()=>{setError('');setConfirmation({exam,opened:true,op:crypto.randomUUID()});}}><UnlockKeyhole className="mr-2 h-4 w-4"/>{compact?'Ouvrir l’accès':'Ouvrir'}</Button>
   <Button variant="outline" disabled={busy||exam.opened===false} onClick={()=>{setError('');setConfirmation({exam,opened:false,op:crypto.randomUUID()});}}><LockKeyhole className="mr-2 h-4 w-4"/>{compact?'Fermer l’accès':'Fermer'}</Button>
  </div>)}
  <Dialog open={!!confirmation} onOpenChange={open=>{if(!open&&!busy)setConfirmation(null);}}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto" aria-describedby={undefined}><DialogHeader><DialogTitle>{confirmation?.opened?'Ouvrir':'Fermer'} l’accès à {confirmation?.exam.exam_id}</DialogTitle></DialogHeader>
   <p className="break-words">Session : {context?.session_name??sessionName}</p>
   <p className="text-sm text-muted-foreground">{sessionId}</p>
   <p>Pour les élèves présentiels inscrits et éligibles uniquement. Aucun accès hors parcours, aucune modification des réponses, notes ou copies.</p>
   <p>Les épreuves déjà commencées pourront continuer, être sauvegardées et remises, sans modifier leur chronomètre.</p>
   {error && <p role="alert" className="text-destructive">{error}</p>}
   <DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setConfirmation(null)}>Annuler</Button><Button disabled={busy||!context} onClick={()=>void confirm()}>{busy?'Confirmation en cours…':'Confirmer'}</Button></DialogFooter>
  </DialogContent></Dialog>
 </section>;
}