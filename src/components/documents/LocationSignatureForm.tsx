import { useRef, useState } from 'react';
import { FileSignature, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SignaturePad } from '@/components/onboarding/SignaturePad';
import { LocationPdfPreview } from '@/components/crm/apprenant-sections/LocationPdfPreview';

export interface LocationPublicDoc {
  modele_code: 'contrat_location'; reference: string; destinataire_nom: string;
  texte_empreinte: string; statut: string; fileUrl: string;
  signedFileUrl?: string; signed_at?: string;
}
/** Preview integration only: successful submission must read the same signed receipt back. */
export function LocationSignatureForm({ doc, submit, read }: {
  doc: LocationPublicDoc;
  submit(p: { signature: string; consentement: boolean; empreinte_vue: string; operation_id: string }): Promise<{ success?: boolean; error?: string }>;
  read(): Promise<LocationPublicDoc>;
}) {
  const [current, setCurrent] = useState(doc);
  const [signature, setSignature] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const flight = useRef(false);
  const operation = useRef(crypto.randomUUID());
  const signed = current.statut === 'signe';
  const sign = async () => {
    if (flight.current) return;
    if (!consent || !signature) { setError('Votre signature et votre accord sont obligatoires.'); return; }
    flight.current = true; setBusy(true); setError('');
    try {
      const result = await submit({ signature, consentement: true, empreinte_vue: doc.texte_empreinte, operation_id: operation.current });
      if (!result.success || result.error) throw new Error(result.error || 'Signature non confirmée.');
      const confirmed = await read();
      if (confirmed.reference !== doc.reference || confirmed.texte_empreinte !== doc.texte_empreinte || confirmed.statut !== 'signe' || !confirmed.signed_at || !confirmed.signedFileUrl) throw new Error('Confirmation du contrat signé indisponible.');
      setCurrent(confirmed);
    } catch (e) { setError(`${e instanceof Error ? e.message : 'Envoi indisponible.'} Votre tracé reste sur cette page ; réessayez pour vérifier.`); }
    finally { flight.current = false; setBusy(false); }
  };
  return <main className="max-w-3xl mx-auto p-4 space-y-5">
    <header className="space-y-2"><h1 className="font-bold text-2xl flex items-center gap-2"><FileSignature className="h-6 w-6 shrink-0" />Contrat de location</h1><p>{current.destinataire_nom}</p><p className="text-sm text-muted-foreground break-words">Référence {current.reference}</p></header>
    <div className="h-[60dvh] min-h-80"><LocationPdfPreview url={signed ? current.signedFileUrl || current.fileUrl : current.fileUrl} /></div>
    {signed ? <section className="space-y-3"><p role="status" className="text-success font-semibold">Signature confirmée le {new Date(current.signed_at || '').toLocaleString('fr-FR')}</p><Button asChild variant="outline"><a href={current.signedFileUrl} download><Download className="h-4 w-4 mr-2" />Télécharger mon contrat signé</a></Button></section> : <section className="space-y-4 border-t border-border pt-4">
      <label className="flex items-start gap-3 min-h-14 border border-border rounded-md p-4 cursor-pointer"><Checkbox checked={consent} disabled={busy} onCheckedChange={v => setConsent(v === true)} className="mt-1 shrink-0" /><span>J’ai lu ce contrat et ses annexes et j’accepte de signer électroniquement ce contrat de location.</span></label>
      <SignaturePad value={signature} onChange={v => { setSignature(v); operation.current = crypto.randomUUID(); }} disabled={busy} />
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <Button onClick={() => void sign()} disabled={busy} className="w-full min-h-11">{busy ? 'Vérification de la signature…' : 'Signer mon contrat'}</Button>
    </section>}
  </main>;
}