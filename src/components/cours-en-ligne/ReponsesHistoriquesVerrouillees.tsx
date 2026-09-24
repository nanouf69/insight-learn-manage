import { Lock } from "lucide-react";

interface Choix { lettre: string; texte: string }
interface QuestionVerrouillee { id: number | string; enonce?: string; choix?: Choix[] }

interface Props {
  exoId: number | string;
  questions: QuestionVerrouillee[];
  reponses: Record<string, string | string[]>;
}

/**
 * Vue élève : réponses conservées d'un passage précédent. Lecture seule,
 * aucune correction affichée (ni juste, ni fausse), aucun détail technique.
 */
export function ReponsesHistoriquesVerrouillees({ exoId, questions, reponses }: Props) {
  if (questions.length === 0) return null;
  return (
    <section
      aria-label="Réponses conservées de votre passage précédent"
      data-testid="reponses-historiques-verrouillees"
      className="rounded-lg border border-border bg-muted/40 p-4 space-y-3"
    >
      <div className="flex items-start gap-2">
        <Lock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
        <div>
          <p className="font-semibold text-sm text-foreground">Réponses conservées de votre passage précédent</p>
          <p className="text-xs text-muted-foreground">
            Ces réponses ont été enregistrées pendant votre passage. Elles sont conservées telles quelles et ne peuvent plus être modifiées.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {questions.map((q) => {
          const rep = reponses[`${exoId}-${q.id}`];
          const choisies = Array.isArray(rep) ? rep : rep ? [rep] : [];
          return (
            <li key={String(q.id)} data-testid={`verrouillee-${exoId}-${q.id}`} className="rounded-md border border-border bg-background p-3 space-y-1.5">
              <p className="text-sm text-foreground">{q.enonce}</p>
              <div className="space-y-1">
                {(q.choix ?? []).map((c) => {
                  const choisi = choisies.includes(c.lettre);
                  return (
                    <div
                      key={c.lettre}
                      aria-disabled="true"
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${choisi ? "border-2 border-primary bg-primary/10 text-foreground" : "border border-border text-muted-foreground"}`}
                    >
                      <span className="font-bold w-5">{c.lettre}</span>
                      <span>{c.texte}</span>
                      {choisi && <span className="ml-auto text-xs">Votre réponse</span>}
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
