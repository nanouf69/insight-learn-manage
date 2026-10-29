import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Lien vers un quiz externe : aucun enregistrement, aucun jalon, aucune validation de module. */
const QUIZ_PAR_MODULE: Record<number, { titre: string; url: string }> = {
  11: { titre: "Quiz QRC TAXI (39 questions)", url: "https://auto-grade-quiz.lovable.app" },
  5: { titre: "Quiz QRC VTC (48 questions)", url: "https://quick-qna-engine.lovable.app" },
};

export function quizExterneBilan(moduleId: number) {
  return QUIZ_PAR_MODULE[moduleId] ?? null;
}

export default function QuizExterneBilan({ moduleId }: { moduleId: number }) {
  const quiz = quizExterneBilan(moduleId);
  if (!quiz) return null;
  return (
    <div className="mb-4 rounded-lg border bg-card p-4 flex flex-col gap-2">
      <p className="font-semibold text-foreground">{quiz.titre}</p>
      <p className="text-sm text-muted-foreground">Entraînement complémentaire, facultatif, non comptabilisé dans la progression.</p>
      <Button asChild className="w-full">
        <a href={quiz.url} target="_blank" rel="noopener noreferrer">
          Ouvrir le quiz <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}
