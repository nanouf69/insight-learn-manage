import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { locationMailBlockers, LOCATION_SIGNATURE_ACTIVE } from '@/lib/locationSignature';
import type { ContexteSignature } from '@/lib/contratLocationClauses';

export function LocationMailSignature({ context, policeBlockers }: {
  context: Omit<ContexteSignature, 'edlDepartSigne' | 'consentementSpecifique' | 'texteValideJuridiquement'>;
  policeBlockers: string[];
}) {
  const [approved, setApproved] = useState(false);
  const [open, setOpen] = useState(false);
  const blockers = locationMailBlockers({ ...context, texteValideJuridiquement: approved }, policeBlockers, LOCATION_SIGNATURE_ACTIVE);
  return <section className="space-y-3 border-t border-border pt-5" aria-label="Signature du contrat par mail">
    <h3 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" />Signature du client par mail</h3>
    <p className="text-sm break-words">Destinataire : {context.locataire.email || 'Adresse à renseigner'}</p>
    <label className="flex items-start gap-3 min-h-14 rounded-md border border-border p-3 cursor-pointer">
      <Checkbox checked={approved} onCheckedChange={v => setApproved(v === true)} className="mt-1 shrink-0" />
      <span className="text-sm">Je valide le texte de ce contrat et ses annexes après vérification.</span>
    </label>
    <Button variant="outline" onClick={() => setOpen(true)} className="w-full gap-2"><Mail className="h-4 w-4" />Voir le mail de signature</Button>
    <Button disabled={blockers.length > 0} className="w-full gap-2"><Send className="h-4 w-4" />Envoyer pour signature</Button>
    <ul role="status" className="text-sm text-destructive list-disc pl-5 space-y-1">{blockers.map((b, i) => <li key={`${i}-${b}`}>{b}</li>)}</ul>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Mail de signature — aperçu</DialogTitle></DialogHeader>
      <p className="text-sm break-words">À : {context.locataire.email || 'Adresse à renseigner'}</p>
      <p className="font-medium">Votre contrat de location à signer — FTRANSPORT</p>
      <p>Bonjour {context.locataire.nomComplet},</p>
      <p>Merci de lire votre contrat de location et ses annexes, puis de le signer électroniquement depuis votre lien personnel.</p>
      <p>Après confirmation de votre signature, vous pourrez consulter et télécharger votre contrat signé depuis ce même lien.</p>
      <p className="text-sm text-muted-foreground">Aucun lien créé, aucun mail envoyé.</p>
    </DialogContent></Dialog>
  </section>;
}