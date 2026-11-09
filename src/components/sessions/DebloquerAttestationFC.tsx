import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignaturesPapierFC } from './SignaturesPapierFC';

export function DebloquerAttestationFC({ inscription, sessionId, raison }: { inscription: any; sessionId: string; raison: string }) {
  const [open, setOpen] = useState(false);
  if (!inscription?.id || !inscription.apprenant) return null;
  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="shrink-0 gap-2">
      <KeyRound className="h-4 w-4" />Débloquer
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Débloquer — {inscription.apprenant.prenom} {inscription.apprenant.nom}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{raison}</p>
        <SignaturesPapierFC inscriptions={[inscription]} sessionId={sessionId} initialInscriptionId={inscription.id} />
      </DialogContent>
    </Dialog>
  </>;
}