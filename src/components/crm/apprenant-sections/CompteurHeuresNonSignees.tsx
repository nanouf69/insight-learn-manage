import { useQuery } from '@tanstack/react-query';
import { chargerSignaturesManquantes, dateDuJourParis, type SignatureManquante } from '@/lib/signaturesManquantes';
import { heuresRestantSigner, formatMinutesPresence } from '@/lib/heuresRestantSigner';

export function DetailHeuresNonSignees({ rows }: { rows: readonly SignatureManquante[] }) {
  const bilan = heuresRestantSigner(rows, dateDuJourParis());
  const fmt = (minutes: number | null) => minutes == null ? 'À vérifier — durée non prouvée' : formatMinutesPresence(minutes);
  return <section aria-label="Heures non signées" className="space-y-3 border-y py-4">
    <div><h3 className="text-sm font-semibold">Nombre d’heures restant à signer</h3><p className="text-2xl font-bold text-foreground">{fmt(bilan.minutes)}</p></div>
    <ul className="divide-y">{bilan.details.map(r => <li className="py-2 text-sm break-words" key={`${r.date}|${r.creneau}`}>{r.date.split('-').reverse().join('/')} — {r.horaires ?? r.creneau} — <strong>{fmt(r.minutes)}</strong></li>)}</ul>
    <div><h3 className="text-sm font-semibold">Heures de présence à justifier / régulariser</h3><p className="text-lg font-bold">{fmt(bilan.minutesAJustifier)}</p>
      <p className="text-sm text-muted-foreground">Créneaux sans signature ni preuve de présence liée précisément au créneau. Les validations administratives sans créneau ne réduisent pas ce montant ; elles ne remplacent jamais une signature.</p></div>
  </section>;
}
export function CompteurHeuresNonSignees({ apprenantId }: { apprenantId: string }) {
  const q = useQuery({ queryKey:['relance-signatures-manquantes',apprenantId,'heures'], queryFn:()=>chargerSignaturesManquantes(apprenantId), retry:false });
  if (q.isError) return <p role="alert" className="text-destructive">Heures non signées indisponibles : lecture impossible.</p>;
  if (!q.data || q.isFetching) return <p className="text-muted-foreground">Lecture des heures non signées…</p>;
  return <DetailHeuresNonSignees rows={q.data}/>;
}