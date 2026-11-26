import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExerciseQuestionPrompt, QcmChoiceButtons } from './learnerQuizUi';
import { QCM2_LYON, noteEntrainementLyon } from '@/lib/pratiqueVtcLyonQcm2';

/** Optional rehearsal only. No learner attempt, answer write or module-completion callback. */
export default function PratiqueVtcLyonQcm2() {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [correction, setCorrection] = useState(false);
  const allAnswered = QCM2_LYON.questions.every(q => Boolean(answers[q.id]));
  return <section aria-label={QCM2_LYON.titre} className="space-y-2 border-t border-border pt-4">
    <Button variant="outline" className="gap-2 h-auto whitespace-normal text-left max-w-full py-3" onClick={() => setOpen(true)}>
      <ListChecks className="h-5 w-5 shrink-0" />{QCM2_LYON.titre}
    </Button>
    <p className="text-sm text-muted-foreground">39 questions · Facultatif · Hors jalons</p>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle className="pr-6">{QCM2_LYON.titre}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground" role="status">{Object.keys(answers).length}/39 réponses{correction ? ` · Résultat d’entraînement : ${noteEntrainementLyon(answers)}/39` : ''}</p>
        <div className="space-y-6">
          {QCM2_LYON.questions.map((q, index) => <div key={q.id} className="space-y-3 border-b border-border pb-5" data-lyon-question={q.id}>
            <ExerciseQuestionPrompt questionNumber={index + 1} prompt={{ question: q.enonce }} />
            <QcmChoiceButtons choices={q.choix} selected={answers[q.id] ? [answers[q.id]] : []} multi={false} showResults={correction} disabled={correction}
              onSelect={letter => setAnswers(previous => ({ ...previous, [q.id]: letter }))} />
            {correction && <p className="text-sm text-muted-foreground">{q.explication}</p>}
          </div>)}
        </div>
        <Button disabled={!allAnswered || correction} onClick={() => setCorrection(true)}>Voir le corrigé</Button>
      </DialogContent>
    </Dialog>
  </section>;
}