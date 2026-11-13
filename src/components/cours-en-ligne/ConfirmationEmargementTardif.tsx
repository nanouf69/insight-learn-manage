import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ConfirmationEmargementTardif({ date, creneau, existing, onClose }: {
  date: string; creneau: string; existing: boolean; authorized: boolean; active: boolean; error?: string;
  onClose: () => void; onContinue: () => void;
}) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{existing ? 'Signature déjà enregistrée' : 'Signature passée interdite'}</DialogTitle>
        <DialogDescription>{date} · {creneau}</DialogDescription>
      </DialogHeader>
      {existing ? <p className="text-sm">La signature ou la déclaration d’absence existante, son identité et son horodatage sont conservés. Rien ne sera remplacé ni dupliqué. Si cette preuve est erronée, contactez le centre pour une rectification tracée.</p> : <div className="space-y-3 text-sm">
        <p>Une date passée ne peut pas être signée par un apprenant.</p>
        <p>Contactez le centre pour une gestion administrative justifiée de présence ou d’absence, distincte de votre signature.</p>
      </div>}
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>{existing ? 'Je confirme : conserver la preuve' : 'Annuler'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}