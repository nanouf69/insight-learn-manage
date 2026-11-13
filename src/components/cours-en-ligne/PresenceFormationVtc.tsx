import { useTauxPresenceHeures, TauxPresenceSessionsCard } from '@/components/crm/TauxPresenceSessionsCard';
import { estVtcPresentiel, tauxTotalPresence } from '@/lib/tauxTotalPresence';

/** Read-only learner attendance; separate from e-learning and module validation. */
export function PresenceFormationVtc({ apprenantId, typeApprenant, formationChoisie }: { apprenantId?: string | null; typeApprenant?: string | null; formationChoisie?: string | null }) {
  const actif = estVtcPresentiel({type_apprenant:typeApprenant,formation_choisie:formationChoisie});
  const {data,erreur} = useTauxPresenceHeures(apprenantId,actif,'vtc');
  if (!actif || !apprenantId) return null;
  const total = tauxTotalPresence(data);
  return <section className="mb-6 border-y border-border py-4" aria-label="Présence formation VTC">
    <div className="flex flex-wrap items-baseline justify-between gap-2" data-indicateur="TAUX TOTAL">
      <h3 className="font-semibold">Présence formation — TOTAL</h3>
      <strong className="text-2xl text-destructive">{total ? `${total.pct.toLocaleString('fr-FR',{maximumFractionDigits:1})} %` : '—'}</strong>
      <p className="w-full text-sm text-muted-foreground">{total ? `${total.faites.toLocaleString('fr-FR',{maximumFractionDigits:1})} h prouvées / ${total.prevues} h prévues` : erreur ? 'Présence indisponible' : 'Chargement…'}</p>
    </div>
    <TauxPresenceSessionsCard apprenantId={apprenantId} filiere="vtc" />
  </section>;
}