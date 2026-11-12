import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, FileDown, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { chargerSignaturesRassemblees, formaterCompteSignaturesPdf } from '@/lib/signaturesRassemblees';
import { generateSignaturesRassembleesPdf } from '@/lib/pdf/signatures-rassemblees';
import { chargerSignaturesManquantes } from '@/lib/signaturesManquantes';
import { generateSignaturesManquantesPdf } from '@/lib/pdf/signatures-manquantes-pdf';
import { EmargementPersonnaliseExport } from './EmargementPersonnaliseExport';

function ExportManquantes({ apprenant }: { apprenant: any }) {
  const [state, setState] = useState<'idle' | 'loading' | 'none' | 'error'>('idle');
  const [pdf, setPdf] = useState<{ blob: Blob; fileName: string; count: number } | null>(null);
  const prepare = async () => {
    setState('loading');
    try {
      const rows = await chargerSignaturesManquantes(apprenant.id);
      if (!rows.length) { setPdf(null); setState('none'); return; }
      const r = generateSignaturesManquantesPdf(apprenant, rows);
      setPdf({ blob: r.blob, fileName: r.fileName, count: rows.length }); setState('idle');
    } catch { setPdf(null); setState('error'); }
  };
  const download = () => {
    if (!pdf) return;
    const url = URL.createObjectURL(pdf.blob);
    const a = document.createElement('a'); a.href = url; a.download = pdf.fileName;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  return <div className="flex flex-col items-start gap-1">
    <Button variant="outline" size="sm" disabled={state === 'loading'} onClick={() => pdf ? download() : void prepare()} className="gap-2 whitespace-normal h-auto min-h-9 text-left">
      {state === 'loading' ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <FileDown className="h-4 w-4 shrink-0" />}
      {state === 'loading' ? 'Préparation…' : pdf ? `Télécharger — Signatures manquantes à imprimer (${pdf.count})` : 'Signatures manquantes à imprimer (PDF)'}
    </Button>
    {state === 'none' && <p className="text-xs text-muted-foreground">Aucune signature manquante.</p>}
    {state === 'error' && <p role="alert" className="text-xs text-destructive">Lecture impossible : aucun PDF produit.</p>}
  </div>;
}

function ExportPourCompte({ apprenant, userId, seulementPlanning, totalAttendu, totalIndisponible }: { apprenant: any; userId: string; seulementPlanning: boolean; totalAttendu: number | null; totalIndisponible: boolean }) {
  const libelle = seulementPlanning ? 'Signatures session + pratique (PDF)' : 'Toutes les signatures (PDF)';
  const [requested, setRequested] = useState(false);
  const [voir, setVoir] = useState(false);
  const query = useQuery({
    queryKey: ['signatures-rassemblees-export', userId, apprenant.id, seulementPlanning], enabled: requested,
    gcTime: 0, staleTime: 0, retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
      if (error || !data) throw new Error('Lecture administrateur requise');
      const rows = await chargerSignaturesRassemblees(apprenant.id, seulementPlanning);
      if (!rows.length) return null;
      const pdf = generateSignaturesRassembleesPdf(apprenant, rows);
      return { ...pdf, signatures: rows.length, rows };
    },
  });
  const download = () => {
    if (!query.data || query.isFetching) return;
    const url = URL.createObjectURL(query.data.blob);
    const a = document.createElement('a'); a.href = url; a.download = query.data.fileName;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const compte = query.data && !query.isError ? formaterCompteSignaturesPdf(query.data.signatures, totalAttendu, totalIndisponible) : null;
  return <div className="flex flex-col items-start gap-1">
    <div className="flex flex-wrap items-center gap-2">
    <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.data && !query.isError ? download() : requested ? void query.refetch() : setRequested(true)} className="gap-2 whitespace-normal h-auto min-h-9 text-left">
      {query.isFetching ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <FileDown className="h-4 w-4 shrink-0" />}
      {query.isFetching ? 'Préparation des signatures…' : query.data && !query.isError ? `Télécharger — ${libelle}` : libelle}
    </Button>
    <Button variant="outline" size="sm" className="gap-2 min-h-11" aria-label={`Voir — ${libelle}`} onClick={() => {
      setVoir(true);
      if (requested) void query.refetch();
      else setRequested(true);
    }} disabled={query.isFetching}>
      <Eye className="h-4 w-4" /> Voir
    </Button>
    </div>
    <Dialog open={voir} onOpenChange={setVoir}>
      <DialogContent className="max-w-3xl w-[calc(100%-2rem)] max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{seulementPlanning ? 'Signatures session + pratique' : 'Toutes les signatures'}</DialogTitle>
          <DialogDescription>{[apprenant.prenom, apprenant.nom].filter(Boolean).join(' ')} — consultation des signatures enregistrées</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto min-h-0 space-y-3">
          {query.isFetching ? <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Chargement des signatures…</p>
            : query.isError ? <div role="alert" className="space-y-2"><p className="text-destructive">Lecture des signatures indisponible.</p><Button variant="outline" onClick={() => void query.refetch()}>Réessayer</Button></div>
            : query.isSuccess && !query.data ? <p>Aucune signature enregistrée.</p>
            : query.data?.rows.map((row, index) => <figure key={row.id} className="rounded-md border border-border p-3 space-y-2">
              <figcaption className="text-sm">
                <p className="font-semibold"><span className="mr-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-primary-foreground" aria-label={`Signature n° ${index + 1}`}>{index + 1}</span>{row.date.split('-').reverse().join('/')} — {row.creneau}</p>
                <p>{row.activite} — {row.horaires}</p>
                <p className="text-muted-foreground">{row.signedAt && Number.isFinite(Date.parse(row.signedAt)) ? `Signé le ${new Date(row.signedAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}` : 'Date de signature non renseignée'}</p>
                {row.absent && <p className="text-destructive">Absence enregistrée</p>}
              </figcaption>
              <img src={row.signature} alt={`Signature du ${row.date} — ${row.creneau}`} className="h-24 w-full object-contain" />
            </figure>)}
        </div>
      </DialogContent>
    </Dialog>
    {query.isError && <p role="alert" className="text-xs text-destructive">Signatures indisponibles : aucun PDF incomplet n’a été produit.</p>}
    {requested && query.isSuccess && !query.data && <p className="text-xs text-muted-foreground">Aucune signature enregistrée.</p>}
    {query.data && !query.isError && <p className="text-xs text-muted-foreground">PDF prêt — {query.data.pages} page(s), images disponibles de session et pratique.</p>}
    {compte && (
      <p
        data-testid="signatures-pdf-compte"
        className={
          compte.ton === 'ok' ? 'text-xs font-semibold text-emerald-700 dark:text-emerald-400'
          : compte.ton === 'partiel' ? 'text-xs font-semibold text-destructive'
          : compte.ton === 'excedent' ? 'text-xs font-semibold text-amber-700 dark:text-amber-400'
          : 'text-xs text-muted-foreground'
        }
      >
        {compte.texte} — images présentes dans le PDF ; une date de signature sans image n’est pas reproduite.
      </p>
    )}
  </div>;
}

export function SignaturesRassembleesExport({ apprenant, totalAttendu = null, totalIndisponible = false, onOuvrirRelanceSignatures }: { apprenant: any; totalAttendu?: number | null; totalIndisponible?: boolean; onOuvrirRelanceSignatures?: () => void }) {
  const { user, loading } = useAuth();
  if (loading || !user?.id || !apprenant?.id) return null;
  return <div className="flex flex-col items-start gap-2">
    <ExportPourCompte key={`${user.id}:${apprenant.id}:all`} userId={user.id} apprenant={apprenant} seulementPlanning={false} totalAttendu={totalAttendu} totalIndisponible={totalIndisponible} />
    <ExportPourCompte key={`${user.id}:${apprenant.id}:plan`} userId={user.id} apprenant={apprenant} seulementPlanning totalAttendu={totalAttendu} totalIndisponible={totalIndisponible} />
    <div className="flex flex-wrap items-start gap-2">
      <ExportManquantes key={`${apprenant.id}:manquantes`} apprenant={apprenant} />
      {onOuvrirRelanceSignatures && (
        <Button variant="outline" size="sm" onClick={onOuvrirRelanceSignatures} className="gap-2 whitespace-normal h-auto min-h-9 text-left">
          <Mail className="h-4 w-4 shrink-0" />
          À envoyer par mail
        </Button>
      )}
    </div>
    <EmargementPersonnaliseExport key={`${apprenant.id}:perso`} apprenant={apprenant} />
  </div>;
}
