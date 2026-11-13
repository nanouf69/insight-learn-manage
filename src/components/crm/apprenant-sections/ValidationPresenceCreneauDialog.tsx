import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { dureePratiqueSchema } from '@/lib/presenceCreneau';
import { formatMinutesPresence } from '@/lib/heuresRestantSigner';
export interface CiblePresenceCreneau { date?: string; creneau?: string; horaires?: string; minutes?: number | null; pratique: boolean; conflit?: boolean }
export function ValidationPresenceCreneauDialog({cible,onClose}:{cible:CiblePresenceCreneau|null;onClose:()=>void}) {
  const [formateur,setFormateur]=useState('');const [session,setSession]=useState('');const [preuve,setPreuve]=useState('');
  const [date,setDate]=useState('');const [duree,setDuree]=useState('');const [confirme,setConfirme]=useState(false);
  useEffect(()=>{setFormateur('');setSession('');setPreuve('');setDate(cible?.date ?? '');setDuree(cible?.minutes != null ? String(cible.minutes/60) : '0');setConfirme(false);},[cible]);
  const parsed=dureePratiqueSchema.safeParse(duree.replace(',','.'));
  return <Dialog open={!!cible} onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{cible?.pratique?'Valider la présence pratique':'Valider manuellement la présence'}</DialogTitle></DialogHeader>
    <p className="text-sm">{cible?.date?.split('-').reverse().join('/') ?? 'Date à vérifier'} — {cible?.horaires ?? 'Créneau pratique à rattacher'} {cible?.minutes != null ? `— ${formatMinutesPresence(cible.minutes)}` : ''}</p>
    {cible?.conflit&&<p role="alert" className="text-sm text-destructive">Une validation sans créneau précis existe ce jour : rapprochement requis, aucune heure supplémentaire comptée automatiquement.</p>}
    <label className="text-sm">Session et inscription réelles<Input aria-label="Session et inscription réelles" value={session} onChange={e=>setSession(e.target.value)} maxLength={200}/></label>
    <label className="text-sm">Formateur présent<Input aria-label="Formateur présent" value={formateur} onChange={e=>setFormateur(e.target.value)} maxLength={100}/></label>
    <label className="text-sm">Date de la séance<Input aria-label="Date de la séance" type="date" value={date} onChange={e=>setDate(e.target.value)} readOnly={!!cible?.date}/></label>
    {cible?.pratique&&<label className="text-sm">Durée pratique vérifiée (0 à 6 h)<Input aria-label="Durée pratique vérifiée" type="number" min="0" max="6" step="0.5" value={duree} onChange={e=>setDuree(e.target.value)}/></label>}
    {cible?.pratique&&!parsed.success&&<p role="alert" className="text-destructive text-sm">Durée requise entre 0 et 6 h, en minutes entières.</p>}
    <label className="text-sm">Référence de la preuve de présence<Input aria-label="Référence de la preuve de présence" value={preuve} onChange={e=>setPreuve(e.target.value)} maxLength={200}/></label>
    <label className="flex items-start gap-2 text-sm"><Checkbox checked={confirme} onCheckedChange={v=>setConfirme(v===true)}/>Je confirme le déroulement réel, l’identité du candidat et la preuve de présence.</label>
    <p className="text-sm">Présence validée administrativement — signature apprenant absente. Aucune signature ni absence ne sera remplacée ; la date de validation sera celle du serveur.</p>
    <p role="status" className="text-sm text-muted-foreground">Enregistrement non activé : rattachement exact, journal sécurisé et contrôle des chevauchements doivent être vérifiés avant toute validation réelle.</p>
    <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Fermer</Button><Button disabled>Confirmer la présence</Button></DialogFooter>
  </DialogContent></Dialog>;
}