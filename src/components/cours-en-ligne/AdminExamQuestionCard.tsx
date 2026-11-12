import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichText } from "@/lib/richText";
import { ExamQuestionImage } from "./ExamQuestionImage";
import { getPointsParQuestion, type Matiere, type Question } from "./examens-blancs-data";
import { QuestionFirstPassageRate } from "./QuestionFirstPassageRate";

type AdminExamQuestionCardProps = {
  question: Question;
  questionIndex: number;
  questionCount: number;
  matiere: Matiere;
  examTitre?: string;
  statsEnabled: boolean;
  onEdit: () => void;
  onMove: (direction: "up" | "down") => void;
  onMoveTo: (position: number) => void;
  /** Édition sur place du texte d'une proposition (bonne réponse et points inchangés). */
  onChoixTexteSave?: (index: number, texte: string) => Promise<boolean>;
};

function PropositionEditable({ texte, lettre, onSave }: { texte: string; lettre: string; onSave?: (t: string) => Promise<boolean> }) {
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState(texte);
  const [etat, setEtat] = useState<"repos" | "envoi" | "erreur">("repos");
  if (!onSave) return <span className="min-w-0 flex-1 leading-6">{texte}</span>;
  const ouvrir = () => { setBrouillon(texte); setEtat("repos"); setEdition(true); };
  const annuler = () => { setEdition(false); setEtat("repos"); };
  const enregistrer = async () => {
    if (brouillon === texte) { setEdition(false); return; }
    setEtat("envoi");
    const ok = await onSave(brouillon);
    if (ok) { setEdition(false); setEtat("repos"); } else setEtat("erreur");
  };
  if (!edition) {
    return (
      <button type="button" onClick={ouvrir} className="min-w-0 flex-1 cursor-text rounded text-left leading-6 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Modifier le texte de la proposition ${lettre}`}>
        {texte}
      </button>
    );
  }
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <input
        autoFocus
        value={brouillon}
        disabled={etat === "envoi"}
        onChange={(e) => { setBrouillon(e.target.value); if (etat === "erreur") setEtat("repos"); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); void enregistrer(); }
          if (e.key === "Escape") { e.preventDefault(); annuler(); }
        }}
        aria-label={`Texte de la proposition ${lettre}`}
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={() => void enregistrer()} disabled={etat === "envoi"}>
          {etat === "envoi" ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={annuler} disabled={etat === "envoi"}>Annuler</Button>
        {etat === "erreur" && (
          <span role="alert" className="text-xs text-destructive">Non enregistré : le serveur n'a pas confirmé. Votre texte est conservé, réessayez.</span>
        )}
      </div>
    </div>
  );
}

/** Présentation admin seule : les contenus et les statistiques restent fournis par leurs sources existantes. */
export function AdminExamQuestionCard({
  question: q,
  questionIndex,
  questionCount,
  matiere,
  examTitre,
  statsEnabled,
  onEdit,
  onMove,
  onMoveTo,
  onChoixTexteSave,
}: AdminExamQuestionCardProps) {
  const points = getPointsParQuestion(matiere.id, q.type || "QCM", matiere);

  return (
    <article className="group overflow-hidden rounded-xl border border-border/60 bg-background transition-colors hover:border-border">
      <div className={statsEnabled ? "grid lg:grid-cols-[minmax(0,1fr)_280px]" : ""}>
        <div className="min-w-0 p-4 sm:p-5">
          <div data-testid="cadre-question" className="rounded-lg border-2 border-primary bg-primary/5 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[11px] font-semibold">
              {q.type} · Q{questionIndex + 1}
            </Badge>
            <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground" title={`${matiere.nom} — ${examTitre ?? ""}`}>
              {matiere.nom}{examTitre ? ` — ${examTitre}` : ""}
            </p>
            <Badge variant="outline" className="rounded-md border-primary/30 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {points} pt{points > 1 ? "s" : ""}
            </Badge>
            <div className="flex items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
              <Button size="sm" variant="ghost" className="h-7 w-7 px-0" onClick={onEdit} aria-label={`Modifier la question ${questionIndex + 1}`}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 px-0" disabled={questionIndex === 0} onClick={() => onMove("up")} title="Monter" aria-label={`Monter la question ${questionIndex + 1}`}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 px-0" disabled={questionIndex === questionCount - 1} onClick={() => onMove("down")} title="Descendre" aria-label={`Descendre la question ${questionIndex + 1}`}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              {questionCount > 2 && (
                <select
                  className="h-7 cursor-pointer rounded-md border border-border bg-background px-1 text-[11px] text-muted-foreground"
                  value={questionIndex}
                  onChange={(event) => onMoveTo(Number(event.target.value))}
                  title="Déplacer à la position…"
                  aria-label={`Déplacer la question ${questionIndex + 1} à la position…`}
                >
                  {Array.from({ length: questionCount }, (_, index) => <option key={index} value={index}>Pos {index + 1}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="mt-3 min-w-0">
            <div className="text-[15px] font-medium leading-6 text-foreground"><RichText value={q.enonce} /></div>
            {q.image && (
              <ExamQuestionImage image={q.image} alt={`Question ${q.id}`} className="mt-3 max-h-40 rounded-md border" fallbackClassName="mt-2 text-xs text-muted-foreground italic" />
            )}
          </div>
          </div>

          {q.type === "QCM" && q.choix && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span className="font-medium uppercase tracking-wide">Propositions</span>
                <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> Bonne réponse</span>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {q.choix.map((choice, index) => (
                  <div
                    key={`${choice.lettre}-${index}`}
                    className={`flex min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${choice.correct ? "border-primary/30 bg-primary/5 font-medium text-foreground" : "border-border/50 bg-muted/20 text-muted-foreground"}`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold ${choice.correct ? "border-primary/30 bg-primary/10 text-primary" : "border-border/60 bg-background"}`}>
                      {choice.lettre}
                    </span>
                    <PropositionEditable texte={choice.texte} lettre={choice.lettre} onSave={onChoixTexteSave ? (t) => onChoixTexteSave(index, t) : undefined} />
                    {choice.correct && <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-label="Bonne réponse" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {q.type === "QRC" && q.reponseQRC && (
            <div className="mt-4 rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5 text-sm leading-6 text-foreground">
              <span className="font-semibold text-primary">Réponse attendue : </span>{q.reponseQRC}
            </div>
          )}
        </div>

        {statsEnabled && (
          <aside className="min-w-0 border-t border-border/60 bg-muted/20 p-4 lg:border-l lg:border-t-0" aria-label={`Taux d’erreur de la question ${questionIndex + 1}`}>
            <QuestionFirstPassageRate questionId={q.id} presentation="panel" />
          </aside>
        )}
      </div>
    </article>
  );
}
