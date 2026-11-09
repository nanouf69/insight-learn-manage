/**
 * Shared learner quiz presentation used by the classic "Cours et exercices" quiz pages
 * (ModuleDetailView) and by the future Bilan examen (BilanFutureExam).
 * Presentation only: no data access, no scoring, no persistence. Both screens render the
 * exact same markup so the Bilan examen keeps the form of every other module.
 */
import type { ReactNode } from "react";
import { CheckCircle2, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichText } from "@/lib/richText";

export interface QuizQuestionPromptData {
  question: string;
  passageTitle?: string;
  passageBody?: string;
}

/** Q-badge + question text + optional reading passage (classic exercise prompt). */
export function ExerciseQuestionPrompt({ questionNumber, prompt }: { questionNumber: number; prompt: QuizQuestionPromptData }) {
  return (
    <div className="space-y-2">
      <p className="learner-question-title font-medium whitespace-pre-line">
        <span className="inline-flex items-center justify-center bg-primary/10 text-primary text-xs font-bold rounded px-1.5 py-0.5 mr-1.5">
          Q{questionNumber}
        </span>
        <RichText value={prompt.question} />
      </p>

      {prompt.passageTitle && prompt.passageBody ? (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed">
          <p className="mb-2 font-semibold text-foreground"><RichText value={prompt.passageTitle} /></p>
          <p className="whitespace-pre-line text-foreground"><RichText value={prompt.passageBody} /></p>
        </div>
      ) : null}
    </div>
  );
}

export interface QcmChoiceView { lettre: string; texte: string; correct?: boolean }

/** Classic QCM choice buttons (square ✓ box when multi, lettered circle otherwise). */
export function QcmChoiceButtons({ choices, selected, multi, showResults, onSelect, disabled }: {
  choices: QcmChoiceView[]; selected: string[]; multi: boolean; showResults: boolean;
  onSelect: (lettre: string, el: HTMLButtonElement) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5 ml-2">
      {choices.map((c) => {
        const isSelected = selected.includes(c.lettre);
        let bg = "bg-background hover:bg-muted/50 border";
        if (isSelected && !showResults) bg = "bg-primary/10 border-primary border-2";
        if (showResults && c.correct) bg = "bg-emerald-50 border-emerald-500 border-2 dark:bg-emerald-950";
        if (showResults && isSelected && !c.correct) bg = "bg-destructive/10 border-destructive border-2";
        return (
          <button
            key={c.lettre}
            data-choix={c.lettre}
            data-selected={isSelected ? "1" : undefined}
            data-bonne={showResults && c.correct ? "1" : undefined}
            disabled={disabled}
            onClick={(event) => onSelect(c.lettre, event.currentTarget)}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${bg}`}
          >
            {multi ? (
              <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
                {isSelected ? '✓' : ''}
              </span>
            ) : (
              <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? 'border-primary bg-primary text-primary-foreground' : ''}`}>
                {c.lettre}
              </span>
            )}
            <span className="text-sm">{c.texte}</span>
            {showResults && c.correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

export const QUESTION_IMAGE_SIZES: Record<string, string> = {
  sm: "max-h-40",
  md: "max-h-64",
  lg: "max-h-96",
  xl: "max-h-[32rem]",
  "2xl": "max-h-[48rem]",
};

/** Right-hand "Questions" grid (answered green, to-do red, error dark red). */
export function QuizQuestionSidebar({ items, onJump }: {
  items: { key: string | number; answered: boolean; wrong: boolean }[]; onJump: (index: number) => void;
}) {
  return (
    <aside className="block">
      <div className="sticky top-4 rounded-lg border bg-card p-2 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="text-[10px] font-semibold text-muted-foreground text-center mb-2 uppercase tracking-wide">
          Questions
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {items.map((it, qi) => (
            <button
              key={it.key}
              type="button"
              onClick={() => onJump(qi)}
              className={`w-full aspect-square rounded-md text-xs font-bold transition-colors flex items-center justify-center ${
                it.wrong
                  ? "bg-red-600 text-white border-2 border-red-800 hover:bg-red-700"
                  : it.answered
                    ? "bg-green-500 text-white border border-green-600 hover:bg-green-600"
                    : "bg-red-500 text-white border border-red-600 hover:bg-red-600"
              }`}
              title={it.wrong ? `Q${qi + 1} — erreur ❌` : it.answered ? `Q${qi + 1} — répondue ✓` : `Q${qi + 1} — non répondue ✗`}
            >
              {qi + 1}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-1.5 text-[10px] text-muted-foreground border-t pt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-500 border border-green-600" />
            <span>Répondu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500 border border-red-600" />
            <span>À faire</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-600 border-2 border-red-800" />
            <span>Erreur</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Score circle + "Points : x / y" shown after a quiz is validated. */
export function QuizScoreSummary({ points, total, footnote }: { points: number; total: number; footnote?: ReactNode }) {
  const pct = total > 0 ? Math.round((points / total) * 100) : 0;
  const circleColor = pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-destructive";
  const circleBg = pct >= 80 ? "bg-emerald-50 dark:bg-emerald-950/30" : pct >= 50 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30";
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative w-36 h-36 rounded-full flex items-center justify-center ${circleBg}`}>
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className={circleColor} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: "stroke-dashoffset 1s ease-out" }} />
        </svg>
        <span className={`text-4xl font-black ${circleColor}`}>{pct}%</span>
      </div>
      <p className="text-lg font-bold">Points : {points} / {total}</p>
      {footnote}
    </div>
  );
}

/** Scroll to a question anchor and flash it (answer grid behaviour). */
export function flashQuestionAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[Réponses] Anchor introuvable: ${id}`);
    return;
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.add("ring-4", "ring-primary");
  setTimeout(() => el.classList.remove("ring-4", "ring-primary"), 1500);
}

/** "Réponses" grid: one dot per question (green correct, red wrong). */
export function QuizAnswerGrid({ items, onJump }: { items: { key: string | number; correct: boolean }[]; onJump: (index: number) => void }) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <h4 className="font-semibold text-sm">Réponses</h4>
      <p className="text-xs text-muted-foreground">Cliquez sur une question pour revoir la correction</p>
      <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
        {items.map((it, qi) => (
          <div key={it.key}
            className="flex items-center gap-2 rounded-lg border bg-background p-2 cursor-pointer hover:bg-muted/50 transition-colors"
            title={`Q${qi + 1}: ${it.correct ? "Correct" : "Incorrect"} — Cliquer pour voir`}
            onClick={() => onJump(qi)}
          >
            <span className="text-sm font-bold min-w-[1.2rem] text-center">{qi + 1}</span>
            <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${it.correct ? "bg-emerald-500" : "bg-destructive"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Progrès" (Soumis / Noté) + "Actions" panels below the result. */
export function QuizResultPanels({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-lg border p-4 space-y-2">
        <h4 className="font-semibold text-sm">Progrès</h4>
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs text-muted-foreground">Soumis</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs text-muted-foreground">Noté</span>
          </div>
        </div>
      </div>
      <div className="rounded-lg border p-4 space-y-2">
        <h4 className="font-semibold text-sm">Actions</h4>
        <div className="flex flex-col gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export interface WrongAnswerReviewItem {
  id: string | number;
  enonce: string;
  isQrc: boolean;
  learnerText: string;
  expectedText?: string;
  explication?: string;
}

/** Mandatory "Relisez vos erreurs" dialog before redoing the wrong questions. */
export function WrongAnswersReviewDialog({ open, onOpenChange, items, onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; items: WrongAnswerReviewItem[]; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📖 Relisez vos erreurs avant de recommencer</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Prenez le temps de relire chaque question, votre réponse et la bonne réponse. Vous pourrez ensuite refaire uniquement les questions fausses.
        </p>
        <div className="space-y-4 mt-2">
          {open && items.map((it, idx) => (
            <div key={it.id} className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-2">
              <div className="font-semibold text-sm">Question {idx + 1} — {it.enonce}</div>
              {it.isQrc ? (
                <div className="space-y-1 text-sm">
                  <div className="text-red-700"><span className="font-medium">Votre réponse :</span> {it.learnerText}</div>
                  {it.expectedText && (
                    <div className="text-emerald-700"><span className="font-medium">Réponse attendue :</span> {it.expectedText}</div>
                  )}
                </div>
              ) : (
                <div className="space-y-1 text-sm">
                  <div className="text-red-700">
                    <span className="font-medium">Votre réponse :</span>{" "}
                    {it.learnerText}
                  </div>
                  <div className="text-emerald-700">
                    <span className="font-medium">Bonne réponse :</span>{" "}
                    {it.expectedText ?? ""}
                  </div>
                </div>
              )}
              {it.explication && (
                <div className="text-xs text-muted-foreground border-t pt-1">💡 {it.explication}</div>
              )}
            </div>
          ))}
        </div>
        <Button className="mt-4 w-full gap-2" onClick={onConfirm}>
          ✅ J'ai relu mes erreurs — Refaire les fausses
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** Amber banner shown while only the wrong questions are displayed. */
export function RevisionModeBanner({ count, onShowAll }: { count: number; onShowAll: () => void }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span>🎯 Mode révision — vous ne voyez que les {count} question{count > 1 ? "s" : ""} fausse{count > 1 ? "s" : ""}.</span>
        <Button size="sm" variant="ghost" onClick={onShowAll}>Voir toutes les questions</Button>
      </div>
      <div className="font-semibold text-amber-900 dark:text-amber-200">
        📖 Relisez vos erreurs avant de recommencer les questions fausses.
      </div>
    </div>
  );
}

/** One row of the vertical "Progression" stepper. */
export function ProgressionStep({ label, current, completed, unlocked, isLast, facultative, badge, partNum, onClick }: {
  label: ReactNode; current: boolean; completed: boolean; unlocked: boolean; isLast: boolean;
  facultative?: boolean; badge?: "quiz" | "cours" | null; partNum?: string | null; onClick: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <button
          onClick={() => { if (unlocked) onClick(); }}
          disabled={!unlocked}
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
            current
              ? "border-primary bg-primary text-primary-foreground scale-110 shadow-md shadow-primary/30"
              : completed
                ? "border-emerald-500 bg-emerald-500 text-white"
                : unlocked
                  ? "border-destructive bg-background text-destructive"
                  : "border-muted/50 bg-muted/30 cursor-not-allowed"
          }`}
        >
          {completed && !current && (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {current && (
            <div className="w-2 h-2 rounded-full bg-current" />
          )}
          {!unlocked && !completed && !current && (
            <Lock className="w-3 h-3 text-muted-foreground/50" />
          )}
        </button>
        {!isLast && (
          <div className={`w-0.5 h-8 ${completed ? "bg-emerald-400" : "bg-muted"}`} />
        )}
      </div>
      {/* Label + Badge */}
      <button
        onClick={() => { if (unlocked) onClick(); }}
        disabled={!unlocked}
        className={`text-left text-sm leading-snug pt-1 transition-colors flex items-start gap-1.5 ${
          current
            ? "font-bold text-primary"
            : completed
              ? "text-emerald-600 font-medium"
              : facultative
                ? "text-foreground hover:text-primary"
                : unlocked
                ? "text-destructive hover:text-destructive"
                : "text-muted-foreground/40 cursor-not-allowed"
        }`}
      >
        <span className="flex-1">{label}{facultative
          ? <span className="block text-xs text-muted-foreground">Facultatif — non compté</span>
          : !completed && !current && <span className="block text-xs text-destructive">À terminer</span>}</span>
        {badge === "quiz" ? (
          <span className="shrink-0 inline-flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-300">Quiz</span>
            {partNum && <span className="text-[9px] text-muted-foreground font-medium">Partie {partNum}</span>}
          </span>
        ) : badge === "cours" ? (
          <span className="shrink-0 inline-flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-sky-100 text-sky-700 border border-sky-300">Cours</span>
            {partNum && <span className="text-[9px] text-muted-foreground font-medium">Partie {partNum}</span>}
          </span>
        ) : null}
      </button>
    </div>
  );
}

/** "Avancement" progress bar under the stepper. */
export function ProgressionBar({ percent, legend }: { percent: number; legend?: ReactNode }) {
  return (
    <div className="pt-4 mt-3 border-t space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span className="font-medium">Avancement</span>
        <span className="font-bold text-primary text-base">{percent}%</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      {legend}
    </div>
  );
}

/** "📝 Réponses : x / y" completion strip. */
export function AnswersCompletionStrip({ answered, total }: { answered: number; total: number }) {
  if (total === 0) return null;
  const pctAnswered = Math.round((answered / total) * 100);
  const remaining = total - answered;
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-muted/30 text-sm">
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="font-medium">📝 Réponses : {answered} / {total}</span>
          <span className="text-muted-foreground">{pctAnswered}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/60 transition-all duration-500"
            style={{ width: `${pctAnswered}%` }}
          />
        </div>
      </div>
      {remaining > 0 && (
        <span className="text-xs text-muted-foreground shrink-0">
          {remaining} restante{remaining > 1 ? "s" : ""}
        </span>
      )}
      {remaining === 0 && (
        <span className="text-xs text-emerald-600 font-semibold shrink-0">✅ Complet</span>
      )}
    </div>
  );
}

/** Bottom page navigation: Précédent · n / N · (next/finish button). */
export function QuizPageNavigation({ onPrev, prevDisabled, current, total, children }: {
  onPrev: () => void; prevDisabled: boolean; current: number; total: number; children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <Button
        variant="outline"
        onClick={onPrev}
        disabled={prevDisabled}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Précédent
      </Button>
      <span className="text-sm text-muted-foreground font-medium">
        {current + 1} / {total}
      </span>
      {children}
    </div>
  );
}
