import { Button } from "@/components/ui/button";
import { LIBELLES_STATUT_QUIZ, TITRE_QUIZ_CONFIRMES, TITRE_QUIZ_EN_ATTENTE, type ListesQuiz } from "@/lib/quizStatutListes";

/** Deux groupes nominatifs : confirmés par le serveur / en attente ou indisponibles. */
export default function QuizStatutListes({ listes, onOuvrir, desactive, testId }: {
  listes: ListesQuiz; onOuvrir?: (id: string) => void; desactive?: boolean; testId?: string;
}) {
  return (
    <div className="space-y-1 text-xs" data-testid={testId}>
      {!listes.lisible && (
        <p className="font-semibold text-destructive">{LIBELLES_STATUT_QUIZ.non_verifiable}</p>
      )}
      <div className="text-foreground">
        <p className="font-semibold">✅ {TITRE_QUIZ_CONFIRMES} ({listes.confirmes.length})</p>
        {listes.confirmes.length > 0
          ? <ul className="ml-4 list-disc">{listes.confirmes.map((q) => <li key={q.id}>{q.label}</li>)}</ul>
          : <p className="ml-4 text-muted-foreground">aucun</p>}
      </div>
      <div className="text-destructive">
        <p className="font-semibold">⏳ {TITRE_QUIZ_EN_ATTENTE} ({listes.enAttente.length})</p>
        <ul className="ml-4 space-y-1">
          {listes.enAttente.map((q) => (
            <li key={q.id}>
              {onOuvrir && q.statut !== "indisponible" ? (
                <Button variant="link" className="h-auto whitespace-normal p-0 text-left text-destructive" disabled={desactive}
                  onClick={(e) => { e.stopPropagation(); onOuvrir(q.id); }}>
                  Ouvrir « {q.label} »
                </Button>
              ) : <span className="font-medium">« {q.label} »</span>}
              <span> — {LIBELLES_STATUT_QUIZ[q.statut]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
