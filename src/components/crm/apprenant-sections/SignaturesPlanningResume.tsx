import { useQuery } from '@tanstack/react-query';
import { chargerBilanSignaturesEdof } from '@/lib/signaturesManquantes';

/** Read-only summary shared with Documents and EDOF; never validates an attestation. */
export function SignaturesPlanningResume({ apprenant }: { apprenant: any }) {
  const formation = [apprenant?.type_apprenant, apprenant?.formation_choisie, apprenant?.formation].filter(Boolean).join(' ');
  const query = useQuery({
    queryKey: ['apprenant-bilan-signatures-edof', apprenant.id, formation],
    enabled: Boolean(apprenant?.id),
    queryFn: () => chargerBilanSignaturesEdof(apprenant.id, formation),
  });
  const b = query.data;
  return <section aria-label="Signatures du planning" className="w-full border-b border-border py-3 text-foreground">
    {query.isError ? <p role="alert" className="font-semibold text-destructive">Signatures attendues : indisponibles — erreur de lecture</p>
      : !b ? <p className="text-muted-foreground">Signatures attendues : calcul en cours…</p>
      : <>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-lg font-bold">
          <p>Signatures attendues : {b.planningIncomplet ? 'à vérifier' : b.objectifTotal}</p>
          <p>Signatures recueillies : {b.total}/{b.planningIncomplet ? '—' : b.objectifTotal}</p>
        </div>
        <p className="mt-1 text-sm">Présentiel : {b.theorie}/{b.objectifTheorie} · Pratique : {b.pratique}/{b.objectifPratique}</p>
        {b.planningIncomplet && <p role="alert" className="mt-1 text-sm text-destructive">Planning incomplet : total non confirmé.</p>}
        {b.horsPlanning.length > 0 && <p className="mt-1 text-sm text-destructive">{b.horsPlanning.length} signature(s) hors planning conservée(s), à vérifier.</p>}
      </>}
  </section>;
}