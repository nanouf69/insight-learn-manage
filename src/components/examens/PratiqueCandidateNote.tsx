import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { usePratiqueCandidateNotes } from '@/hooks/usePratiqueCandidateNotes';

type Props = { candidateId: string; candidateName: string; notes: ReturnType<typeof usePratiqueCandidateNotes> };
export function PratiqueCandidateNote({ candidateId, candidateName, notes }: Props) {
  const draft = notes.draft(candidateId);
  const saved = notes.row(candidateId);
  const saving = notes.isSaving(candidateId);
  return <div className="min-w-0 w-full space-y-1 mt-1">
    <div className="flex items-start gap-1">
      <Textarea aria-label={`Note pour ${candidateName}`} placeholder="Note" maxLength={2000}
        className="min-h-9 h-9 w-full text-xs resize-y" value={draft?.text ?? saved?.note ?? ''}
        disabled={!notes.query.isSuccess || saving} onChange={e => notes.edit(candidateId, e.target.value)} />
      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
        title="Enregistrer la note" aria-label={`Enregistrer la note de ${candidateName}`}
        disabled={!draft || saving || !!draft.conflict || !notes.query.isSuccess} onClick={() => void notes.save(candidateId)}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      </Button>
    </div>
    <p role="status" className={`text-xs ${draft?.error || notes.query.isError ? 'text-destructive' : 'text-muted-foreground'}`}>
      {notes.query.isError ? 'Notes indisponibles' : draft?.error ?? (saving ? 'Enregistrement…' : draft ? 'Non enregistrée' : saved ? 'Enregistrée' : '')}
    </p>
    {draft?.conflict && <div className="text-xs space-y-1">
      <p>Note actuellement enregistrée : {draft.conflict.note || '(vide)'}</p>
      <Button type="button" size="sm" variant="outline" onClick={() => notes.acceptBase(candidateId)}>Conserver ma saisie sur cette version</Button>
    </div>}
  </div>;
}