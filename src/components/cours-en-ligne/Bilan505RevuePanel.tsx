import { Checkbox } from '@/components/ui/checkbox';
import type { RevueItem } from '@/lib/bilan505Remise';

const lettres = (v: unknown) => Array.isArray(v) && v.length ? v.join(', ') : 'aucune réponse';

/** Learner-facing review of restored own choices. Shows letters only, never correctness or keys. */
export function Bilan505RevuePanel({ items, questionIds, confirmee, onConfirmee }: {
  items: RevueItem[]; questionIds: string[]; confirmee: boolean; onConfirmee: (v: boolean) => void;
}) {
  if (!items.length) return null;
  const numero = (k: string) => { const i = questionIds.indexOf(k); return i >= 0 ? i + 1 : k; };
  const ambigus = items.filter(i => i.certitude === 'ambigu');
  const certains = items.filter(i => i.certitude === 'certain');
  return (
    <section aria-label="Vérification de vos derniers choix" data-testid="bilan505-revue"
      className="w-full rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm space-y-3">
      <p className="font-semibold">Vérifiez vos derniers choix avant de valider</p>
      {certains.length > 0 && <>
        <p>Votre copie affichait une ancienne réponse pour {certains.length} question{certains.length > 1 ? 's' : ''}. Vos derniers choix enregistrés ont été remis à l’écran :</p>
        <ul className="list-disc pl-5 space-y-1">
          {certains.map(i => <li key={i.question_id}>Question {numero(i.question_id)} : avant {lettres(i.copie)} → maintenant <strong>{lettres(i.dernier)}</strong></li>)}
        </ul>
      </>}
      {ambigus.length > 0 && <>
        <p className="text-destructive">Pour {ambigus.length > 1 ? 'ces questions' : 'cette question'}, l’ordre de vos clics n’est pas certain : choisissez de nouveau votre réponse.</p>
        <ul className="list-disc pl-5 space-y-1">{ambigus.map(i => <li key={i.question_id}>Question {numero(i.question_id)}</li>)}</ul>
      </>}
      {ambigus.length === 0 && (
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox checked={confirmee} onCheckedChange={v => onConfirmee(v === true)} aria-label="Je confirme mes choix" className="mt-0.5" />
          <span>J’ai relu ces questions : ce sont bien mes réponses. Vous pouvez encore les modifier avant de valider.</span>
        </label>
      )}
    </section>
  );
}
