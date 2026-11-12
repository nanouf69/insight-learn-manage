import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ExerciseQuestionPrompt, QcmChoiceButtons, ProgressionStep, QUESTION_IMAGE_SIZES, QuizScoreSummary } from "./learnerQuizUi";
import { ExamQuestionImage } from "./ExamQuestionImage";
import { useAccesComplementVtc } from "./BilanVtcComplements";

export const NOMS_MATIERES_BILAN = ["Réglementation T3P", "Gestion", "Sécurité routière", "Français", "Anglais"];
export type QuestionBilanPresentation = { id: number; enonce: string; image?: string; imageSize?: string; support?: { numero: number; paragraphes: string[] }; choix?: { lettre: string; texte: string }[] };

/** Presentation only: no reads, effects, receipts or persistence. */
export function BilanMatiereSteps({ current, submitted, onSelect }: { current: number; submitted: boolean[]; onSelect: (index: number) => void }) {
  const ouvrirComplement = useAccesComplementVtc();
  return <div className="space-y-1.5">{NOMS_MATIERES_BILAN.map((nom, i) => <ProgressionStep key={nom} label={`📝 Quiz — ${nom}`} current={current === i} completed={submitted[i] === true} unlocked isLast={i === 4 && !ouvrirComplement} badge="quiz" onClick={() => onSelect(i)} />)}
    {ouvrirComplement && <>
      <ProgressionStep label="F(V) — Développement commercial" current={false} completed={false} unlocked badge="quiz" onClick={() => ouvrirComplement(505)} />
      <ProgressionStep label="G(V) — Réglementation spécifique" current={false} completed={false} unlocked isLast badge="quiz" onClick={() => ouvrirComplement(506)} />
    </>}
  </div>;
}
export function BilanMatiereCard({ nom, tools, children }: { nom: string; tools?: ReactNode; children: ReactNode }) {
  return <Card className="scroll-mt-4 transition-all"><CardContent className="p-6 space-y-4"><div className="flex items-center justify-between gap-2 flex-wrap"><h3 className="text-lg font-bold">📝 {nom}</h3>{tools}</div>{children}</CardContent></Card>;
}
export function BilanQuestionCard({ question: q, index, selected = [], disabled, showResults = false, correct, wrong = false, missing = false, anchor, onSelect }: { question: QuestionBilanPresentation; index: number; selected?: string[]; disabled: boolean; showResults?: boolean; correct?: string[]; wrong?: boolean; missing?: boolean; anchor?: string; onSelect?: (letter: string) => void }) {
  const prompt = q.support ? { question: q.enonce, passageTitle: `Texte ${q.support.numero}`, passageBody: q.support.paragraphes.join("\n\n") } : { question: q.enonce };
  return <div id={anchor} data-learner-question data-answer-scroll-anchor data-question-id={q.id} data-question-faute={wrong ? "1" : undefined} className={`space-y-2 p-4 border rounded-lg scroll-mt-20 transition-all ${wrong ? 'border-destructive border-4 bg-destructive/10' : missing ? 'border-destructive border-2 bg-destructive/5' : ''}`}>
    <ExerciseQuestionPrompt questionNumber={index + 1} prompt={prompt} />
    {q.image && <ExamQuestionImage image={q.image} alt="Illustration" className={`${QUESTION_IMAGE_SIZES[q.imageSize ?? "sm"] ?? "max-h-40"} rounded border object-contain ml-2`} fallbackClassName="ml-2 text-xs text-muted-foreground italic" />}
    <p className="text-xs text-muted-foreground italic ml-2">⚠️ Plusieurs réponses possibles</p>
    <QcmChoiceButtons choices={(q.choix ?? []).map(ch => ({ ...ch, correct: showResults ? correct?.includes(ch.lettre) : undefined }))} selected={selected} multi showResults={showResults} disabled={disabled} onSelect={onSelect ?? (() => {})} />
  </div>;
}
export function BilanRemiseSummary({ correct, total }: { correct: number; total: number }) {
  return <QuizScoreSummary points={correct} total={total} footnote={<p className="text-xs text-muted-foreground">Matière remise : {correct}/{total} bonnes réponses</p>} />;
}