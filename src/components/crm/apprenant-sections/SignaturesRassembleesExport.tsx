import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { chargerSignaturesRassemblees, formaterCompteSignaturesPdf } from '@/lib/signaturesRassemblees';
import { generateSignaturesRassembleesPdf } from '@/lib/pdf/signatures-rassemblees';

function ExportPourCompte({ apprenant, userId, seulementPlanning, totalAttendu, totalIndisponible }: { apprenant: any; userId: string; seulementPlanning: boolean; totalAttendu: number | null; totalIndisponible: boolean }) {
  const libelle = seulementPlanning ? 'Signatures session + pratique (PDF)' : 'Toutes les signatures (PDF)';
  const [requested, setRequested] = useState(false);
  const query = useQuery({
    queryKey: ['signatures-rassemblees-export', userId, apprenant.id, seulementPlanning], enabled: requested,
    gcTime: 0, staleTime: 0, retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
      if (error || !data) throw new Error('Lecture administrateur requise');
      const rows = await chargerSignaturesRassemblees(apprenant.id, seulementPlanning);
      if (!rows.length) return null;
      const pdf = generateSignaturesRassembleesPdf(apprenant, rows);
      return { ...pdf, signatures: rows.length };
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
    <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.data && !query.isError ? download() : requested ? void query.refetch() : setRequested(true)} className="gap-2 whitespace-normal h-auto min-h-9 text-left">
      {query.isFetching ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <FileDown className="h-4 w-4 shrink-0" />}
      {query.isFetching ? 'Préparation des signatures…' : query.data && !query.isError ? `Télécharger — ${libelle}` : libelle}
    </Button>
    {query.isError && <p role="alert" className="text-xs text-destructive">Signatures indisponibles : aucun PDF incomplet n’a été produit.</p>}
    {requested && query.isSuccess && !query.data && <p className="text-xs text-muted-foreground">Aucune signature enregistrée.</p>}
    {query.data && !query.isError && <p className="text-xs text-muted-foreground">PDF prêt — {query.data.pages} page(s), pratique incluse.</p>}
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
        {compte.texte}
      </p>
    )}
  </div>;
}

export function SignaturesRassembleesExport({ apprenant, totalAttendu = null, totalIndisponible = false }: { apprenant: any; totalAttendu?: number | null; totalIndisponible?: boolean }) {
  const { user, loading } = useAuth();
  if (loading || !user?.id || !apprenant?.id) return null;
  return <div className="flex flex-col items-start gap-2">
    <ExportPourCompte key={`${user.id}:${apprenant.id}:all`} userId={user.id} apprenant={apprenant} seulementPlanning={false} totalAttendu={totalAttendu} totalIndisponible={totalIndisponible} />
    <ExportPourCompte key={`${user.id}:${apprenant.id}:plan`} userId={user.id} apprenant={apprenant} seulementPlanning totalAttendu={totalAttendu} totalIndisponible={totalIndisponible} />
  </div>;
}
