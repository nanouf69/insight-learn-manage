import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from '@/components/ui/dialog';
export interface CibleSignatureRevision {documentId:string;documentNom:string;zoneId:string;zoneNom:string;signataireNom:string;signedAt:string;image:string}
export function SignatureRevocationDialog({cible,onClose}:{cible:CibleSignatureRevision;onClose:()=>void}) {
 const [motif,setMotif]=useState('');const [confirme,setConfirme]=useState(false);
 return <Dialog open onOpenChange={v=>{if(!v)onClose();}}><DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Annuler et refaire la signature</DialogTitle><DialogDescription>{cible.documentNom} — {cible.zoneNom}</DialogDescription></DialogHeader>
 <p className="text-sm break-words">Signataire : {cible.signataireNom||'Identité à vérifier'}</p>
 <p className="text-sm">Enregistrée le {new Date(cible.signedAt).toLocaleString('fr-FR',{timeZone:'Europe/Paris'})} (Paris)</p>
 <img src={cible.image} alt="Signature originale conservée" className="w-full h-24 object-contain border border-border"/>
 <p className="text-sm">La preuve originale et son PDF seront conservés. Seule cette zone sera à refaire ; les autres signatures resteront inchangées.</p>
 <label className="text-sm space-y-1">Motif (facultatif)<Input aria-label="Motif (facultatif)" value={motif} onChange={e=>setMotif(e.target.value)} maxLength={200}/></label>
 <label className="flex items-start gap-2 text-sm"><Checkbox checked={confirme} onCheckedChange={v=>setConfirme(v===true)}/>Je confirme l’annulation de cette signature uniquement.</label>
 <p role="status" className="text-sm text-destructive">Annulation indisponible : journal sécurisé et archive PDF non activés. Aucun changement ne sera enregistré.</p>
 <DialogFooter><Button variant="outline" onClick={onClose}>Conserver la signature</Button><Button disabled>Confirmer l’annulation</Button></DialogFooter></DialogContent></Dialog>;
}