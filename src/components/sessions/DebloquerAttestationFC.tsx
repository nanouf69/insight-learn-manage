import { useState } from 'react';
import { KeyRound, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignaturesPapierFC } from './SignaturesPapierFC';

export function DebloquerAttestationFC({ inscription, sessionId, raison, eligible, onDownload, onRefresh }: { inscription: any; sessionId: string; raison: string; eligible: boolean; onDownload: () => void; onRefresh: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  if (!inscription?.id || !inscription.apprenant) return null;
  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="shrink-0 gap-2">
      <KeyRound className="h-4 w-4" />Débloquer
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Débloquer — {inscription.apprenant.prenom} {inscription.apprenant.nom}</DialogTitle></DialogHeader>
        <p role="status" className="text-sm text-muted-foreground">{eligible ? 'Présence confirmée et facture acquittée : attestation disponible.' : raison}</p>
        <SignaturesPapierFC inscriptions={[inscription]} sessionId={sessionId} initialInscriptionId={inscription.id} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void onRefresh()}><RefreshCw className="mr-2 h-4 w-4" />Actualiser les droits</Button>
          <Button disabled={!eligible} onClick={onDownload}><Download className="mr-2 h-4 w-4" />Télécharger l’attestation</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}