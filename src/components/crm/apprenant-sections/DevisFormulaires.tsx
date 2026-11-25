import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Eye, PenLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { devisSignatureEvidence, type DevisEvidenceSource } from '@/lib/devisSignatureEvidence';
import { generateDocumentIndividuelPdf } from '@/lib/pdf/document-individuel';
import { ContratFormationSection } from './ContratFormationSection';
import type { ContractLearner } from '@/lib/contratFormation/prefill';
import { toast } from 'sonner';
import { ouvrirPdfPriveUrl } from '@/lib/ouvrirPdfPrive';

interface Quote {
  id: string; titre: string; evidence: DevisEvidenceSource; url?: string | null;
  document?: { type_document: string; titre: string; donnees: Record<string, unknown>; completed_at: string };
}
export function DevisFormulaires({ apprenant, onOuvrirDevis }: { apprenant: ContractLearner; onOuvrirDevis?: () => void }) {
  const [prepare, setPrepare] = useState(false);
  const { data: quotes = [], isLoading, isError } = useQuery({
    queryKey: ['devis-signatures-formulaires', apprenant.id],
    queryFn: async (): Promise<Quote[]> => {
      const rows: Quote[] = [];
      for (let offset = 0; ; offset += 200) {
        const [sent, forms] = await Promise.all([
          supabase.from('devis_envois').select('id,modele,formation,statut,signed_at,devis_signe_url').eq('apprenant_id', apprenant.id).order('id').range(offset, offset + 199),
          supabase.from('apprenant_documents_completes').select('id,type_document,titre,donnees,completed_at').eq('apprenant_id', apprenant.id).in('type_document', ['devis-formation-continue', 'devis-personnel']).order('id').range(offset, offset + 199),
        ]);
        if (sent.error) throw sent.error;
        if (forms.error) throw forms.error;
        for (const d of sent.data ?? []) rows.push({ id: `envoi-${d.id}`, titre: d.formation || d.modele || 'Devis', evidence: d, url: d.devis_signe_url });
        for (const d of forms.data ?? []) {
          const donnees = (d.donnees ?? {}) as Record<string, unknown>;
          rows.push({ id: `form-${d.id}`, titre: d.titre || 'Devis de formation', evidence: donnees as DevisEvidenceSource, document: { ...d, donnees } });
        }
        if ((sent.data?.length ?? 0) < 200 && (forms.data?.length ?? 0) < 200) break;
      }
      return rows;
    },
  });
  const open = async (q: Quote) => {
    try {
      if (q.url) {
        const match = q.url.match(/\/devis\/(.+)$/);
        const path = match ? decodeURIComponent(match[1]) : q.url;
        const { data, error } = await supabase.storage.from('devis').createSignedUrl(path, 300);
        if (error || !data?.signedUrl) throw new Error('Le fichier signé est indisponible.');
        await ouvrirPdfPriveUrl(data.signedUrl);
      } else if (q.document) {
        generateDocumentIndividuelPdf({ ...apprenant, nom: apprenant.nom ?? '', prenom: apprenant.prenom ?? '' }, q.document);
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Document indisponible'); }
  };
  const signed = quotes.filter(q => devisSignatureEvidence(q.evidence) === 'signe');
  return <section aria-label="Devis signé du candidat" className="space-y-3 border-b pb-5">
    <h2 className="flex items-center gap-2 text-xl font-semibold"><FileText className="h-5 w-5" />Devis signé par le candidat</h2>
    {isLoading ? <p className="text-muted-foreground">Recherche des devis…</p> : isError ? <p role="alert" className="text-destructive">Lecture des devis impossible — absence de signature non confirmée.</p> : <>
      <p className={signed.length ? 'text-foreground' : 'text-destructive'}>{signed.length ? `${signed.length} devis avec preuve de signature enregistrée` : 'Aucun devis signé confirmé dans ce dossier.'}</p>
      {quotes.map(q => {
        const state = devisSignatureEvidence(q.evidence);
        return <div key={q.id} className="space-y-2 border-t pt-3">
          <p className="font-medium break-words">{q.titre}</p>
          <Badge variant={state === 'signe' ? 'default' : 'secondary'}>{state === 'signe' ? 'Signé' : state === 'a_verifier' ? 'Signature à vérifier' : 'Non signé'}</Badge>
          {q.evidence.signed_at && <p className="text-sm text-muted-foreground">Horodatage enregistré : {q.evidence.signed_at}</p>}
          {state === 'signe' && <Button variant="outline" onClick={() => void open(q)} className="gap-2"><Eye className="h-4 w-4" />{q.url ? 'Ouvrir le devis signé original' : 'PDF du formulaire et de sa signature'}</Button>}
        </div>;
      })}
      {(!signed.length || quotes.some(q => devisSignatureEvidence(q.evidence) !== 'signe')) && <Button onClick={() => setPrepare(true)} className="gap-2 h-auto min-h-11 whitespace-normal"><PenLine className="h-4 w-4 shrink-0" />Préparer un devis / contrat à signer et envoyer par mail</Button>}
      {onOuvrirDevis && <Button variant="outline" onClick={onOuvrirDevis} className="block h-auto min-h-11 whitespace-normal">Consulter les devis et les financements tiers</Button>}
    </>}
    <Dialog open={prepare} onOpenChange={setPrepare}><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Préparer le document à signer</DialogTitle></DialogHeader>
      <ContratFormationSection key={apprenant.id} apprenant={apprenant} permettreEnvoi />
    </DialogContent></Dialog>
  </section>;
}