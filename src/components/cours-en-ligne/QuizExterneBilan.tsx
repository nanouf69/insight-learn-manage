import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuizQrcTaxiIntegre, { QUIZ_QRC_TAXI, QuizQrcTaxiId } from "./QuizQrcTaxiIntegre";

/** Lien vers un quiz externe : aucun enregistrement, aucun jalon, aucune validation de module. */
const QUIZ_PAR_MODULE: Record<number, { titre: string; url: string }> = {
  5: { titre: "Quiz QRC VTC (48 questions)", url: "https://quick-qna-engine.lovable.app" },
};

/** Module 11 (Bilan examen TAXI) : deux quiz intégrés, facultatifs, hors progression. */
const QUIZ_INTEGRES_PAR_MODULE: Record<number, QuizQrcTaxiId[]> = { 11: ["complet", "specialites"] };

export function quizExterneBilan(moduleId: number) {
  return QUIZ_PAR_MODULE[moduleId] ?? null;
}
export function quizIntegresBilan(moduleId: number) {
  return QUIZ_INTEGRES_PAR_MODULE[moduleId] ?? [];
}

function CarteIntegree({ id }: { id: QuizQrcTaxiId }) {
  const [ouvert, setOuvert] = useState(false);
  const def = QUIZ_QRC_TAXI[id];
  const exos = def.zones.map((z) => (z === "zupc" ? "ZUPC" : "Métropole de Lyon")).join(" + ");
  return (
    <div className="mb-4 rounded-lg border bg-card p-4 flex flex-col gap-2">
      <p className="font-semibold text-foreground">{def.titre} ({def.items.length} questions + {exos})</p>
      <p className="text-sm text-muted-foreground">Entraînement complémentaire, facultatif, non comptabilisé dans la progression.</p>
      <Button className="w-full" variant={ouvert ? "outline" : "default"} onClick={() => setOuvert((o) => !o)}>
        {ouvert ? "Fermer le quiz" : "Ouvrir le quiz"}
      </Button>
      {ouvert && <QuizQrcTaxiIntegre quiz={id} />}
    </div>
  );
}

export default function QuizExterneBilan({ moduleId }: { moduleId: number }) {
  const integres = quizIntegresBilan(moduleId);
  if (integres.length) return <>{integres.map((id) => <CarteIntegree key={id} id={id} />)}</>;
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
