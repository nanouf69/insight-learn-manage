import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { proposerPrenote, tracePrenote } from './prenote';

export function PrenoteQrc({ reponse, officiel, bareme, disabled, onValider }: {
  reponse: string; officiel: string; bareme: number | null; disabled: boolean;
  onValider: (note: number, trace: string) => void;
}) {
  const p = proposerPrenote(reponse, officiel, bareme);
  const [choix, setChoix] = useState<number | null>(p.note);
  const valide = bareme != null && Number.isFinite(bareme) && bareme > 0 && bareme % 0.5 === 0;
  return <div className="border-t pt-2 space-y-2" data-testid="prenote-qrc">
    <p className="text-sm font-semibold text-primary">PRÉ-NOTE : {p.note == null ? 'À vérifier' : `${String(p.note).replace('.', ',')} / ${bareme}`}</p>
    <p className="text-xs text-muted-foreground">{p.motif} Proposition locale, non enregistrée.</p>
    {valide && bareme != null && <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Ajuster la pré-note">
        {Array.from({ length: Math.round(bareme / 0.5) + 1 }, (_, i) => i * 0.5).map(v =>
          <Button key={v} variant={choix === v ? 'default' : 'outline'} size="sm" aria-pressed={choix === v}
            disabled={disabled} onClick={() => setChoix(v)}>{String(v).replace('.', ',')}</Button>)}
      </div>
      <Button size="sm" disabled={disabled || choix == null} onClick={() => {
        if (choix == null) return;
        onValider(choix, tracePrenote(p, choix, bareme));
      }}>Valider la pré-note comme note définitive</Button>
    </>}
  </div>;
}