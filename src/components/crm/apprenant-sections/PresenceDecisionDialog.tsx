import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { creerControleDecisionPresence, type PresenceDecision, type PresenceDecisionCommande } from '@/lib/presenceRevocations';

export interface PresenceDecisionCible { id: string; heures: number; date: string | null; categorie: string | null; annulee: boolean; version: number }
export function PresenceDecisionDialog({ cible, apprenantId, transport, onClose, onConfirmed }: {
  cible: PresenceDecisionCible | null; apprenantId: string; transport?: (c: PresenceDecisionCommande)=>Promise<PresenceDecision>;
  onClose:()=>void; onConfirmed:()=>void | Promise<void>;
}) {
  const [motif,setMotif]=useState(''); const [busy,setBusy]=useState(false); const [erreur,setErreur]=useState('');
  const lock=useRef(false); const operation=useRef(''); const scope=useRef('');
  useEffect(()=>{scope.current=`${apprenantId}|${cible?.id ?? ''}`; operation.current=crypto.randomUUID();setMotif('');setErreur('');},[apprenantId,cible]);
  const confirm=async()=>{
    if(!cible || !transport || lock.current || (cible.annulee && motif.trim().length<5))return;
    lock.current=true;setBusy(true);setErreur('');const currentScope=scope.current;
    try {
      await creerControleDecisionPresence(transport)({operationId:operation.current,apprenantId,validationId:cible.id,version:cible.version,action:cible.annulee?'restaurer':'annuler',motif:motif.trim()});
      if(scope.current===currentScope){await onConfirmed();if(scope.current===currentScope)onClose();}
    } catch {if(scope.current===currentScope)setErreur('Décision non confirmée : aucun total modifié. Relisez avant de réessayer.');}
    finally{lock.current=false;setBusy(false);}
  };
  return <Dialog open={!!cible} onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{cible?.annulee?'Restaurer les heures':'Êtes-vous sûr de vouloir supprimer ces heures de présence ?'}</DialogTitle></DialogHeader>
    <p className="text-sm break-words">{cible?.heures} h — {cible?.categorie ?? 'catégorie non renseignée'} — présence du {cible?.date?.split('-').reverse().join('/') ?? 'jour non renseigné'}.</p>
    <p className="text-sm">{cible?.annulee?'La restauration remet uniquement cette validation dans le calcul, après dédoublonnage.':'L’annulation retire uniquement cette validation du calcul de présence. Elle reste conservée et pourra être restaurée.'} Aucune signature, absence, preuve originale ni relevé figé ne sera supprimé ou remplacé.</p>
    {cible?.annulee && <Input aria-label="Motif de la décision" placeholder="Motif précis obligatoire" value={motif} onChange={e=>setMotif(e.target.value)} maxLength={500} disabled={busy}/>}
    {!transport&&<p role="status" className="text-sm text-muted-foreground">Annulation réelle non activée en aperçu : le journal sécurisé doit être installé et vérifié avant toute écriture.</p>}
    {erreur&&<p role="alert" className="text-destructive text-sm">{erreur}</p>}
    <DialogFooter className="gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Annuler</Button><Button variant="destructive" disabled={!transport||busy||(!!cible?.annulee&&motif.trim().length<5)} onClick={()=>void confirm()}>{busy?'Confirmation…':cible?.annulee?'Confirmer la restauration':'Oui, supprimer'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}