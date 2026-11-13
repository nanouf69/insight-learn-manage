import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ConfirmationEmargementTardif({ date, creneau, existing, authorized, active, error, onClose, onContinue }: {
  date: string; creneau: string; existing: boolean; authorized: boolean; active: boolean; error?: string;
  onClose: () => void; onContinue: () => void;
}) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{existing ? 'Signature déjà enregistrée' : 'Signature tardive'}</DialogTitle>
        <DialogDescription>{date} · {creneau}</DialogDescription>
      </DialogHeader>
      {existing ? <p className="text-sm">La signature ou la déclaration d’absence existante, son identité et son horodatage sont conservés. Rien ne sera remplacé ni dupliqué. Si cette preuve est erronée, contactez le centre pour une rectification tracée.</p> : <div className="space-y-3 text-sm">
        <p>La date du cours reste inchangée. Votre signature portera sa date et son heure réelles, avec la mention « signé tardivement ».</p>
        <p>Signez uniquement si vous étiez réellement présent à ce créneau. Une signature tardive ne prouve pas, à elle seule, votre présence passée.</p>
        <p className="text-destructive">{error || (!authorized ? 'Aucune autorisation exacte disponible : contactez le centre pour vérifier ce créneau.' : !active ? 'Préparation en aperçu : enregistrement tardif désactivé avant validation et sauvegarde.' : 'L’autorisation et votre identité seront revérifiées avant enregistrement.')}</p>
      </div>}
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>{existing ? 'Je confirme : conserver la preuve' : 'Annuler'}</Button>
        {!existing && <Button disabled={!authorized || !active || Boolean(error)} onClick={onContinue}>Continuer vers la signature</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}