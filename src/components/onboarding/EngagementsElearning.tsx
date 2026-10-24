import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CONSIGNE_ACCES, ENGAGEMENT_PRATIQUE, datesAccesBienvenue, type AccesBienvenue } from '@/lib/bienvenueElearning';
import { formatDateFROrRaw } from '@/lib/safeDateParse';

export function EngagementsElearning({ dossier, acces, pratique, disabled, onChange }: {
  dossier: AccesBienvenue; acces: boolean; pratique: boolean; disabled: boolean;
  onChange: (acces: boolean, pratique: boolean) => void;
}) {
  const dates = datesAccesBienvenue(dossier);
  return <section className="mb-6 scroll-mt-24 space-y-4 border-t border-border pt-5" aria-label="Engagements e-learning">
    <h3 className="font-semibold text-foreground">Votre formation e-learning</h3>
    <div className="space-y-2 text-foreground">
      <p>Début d’accès : <strong>{formatDateFROrRaw(dates.debut) || 'Non renseigné'}</strong></p>
      <p>Fin d’accès : <strong>{formatDateFROrRaw(dates.fin) || 'Non renseignée'}</strong></p>
    </div>
    {!dates.valides && <p role="alert" className="text-destructive">Vos dates d’accès sont manquantes ou incohérentes. Merci de contacter le centre avant de finaliser votre dossier.</p>}
    <div className="flex items-start gap-3">
      <Checkbox id="consigne-acces" className="mt-1 shrink-0" checked={acces} disabled={disabled || !dates.valides} onCheckedChange={v => onChange(v === true, pratique)} />
      <Label htmlFor="consigne-acces" className="cursor-pointer leading-relaxed text-foreground">{CONSIGNE_ACCES}</Label>
    </div>
    <div className="flex items-start gap-3">
      <Checkbox id="engagement-pratique" className="mt-1 shrink-0" checked={pratique} disabled={disabled || !dates.valides} onCheckedChange={v => onChange(acces, v === true)} />
      <Label htmlFor="engagement-pratique" className="cursor-pointer leading-relaxed text-foreground">{ENGAGEMENT_PRATIQUE}</Label>
    </div>
    <p className="text-sm text-muted-foreground">contact@ftransport.fr · 04 28 29 60 91</p>
  </section>;
}