// Standalone fictional view; no auth, backend, storage or transport imports.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { T3pLocalQuestionParts } from "@/components/cours-en-ligne/T3pLocalQuestionParts";
import { projectT3pLocalPresentation } from "@/lib/t3pLocalPresentation";
import { QcmChoiceButtons, ExerciseQuestionPrompt } from "@/components/cours-en-ligne/learnerQuizUi";
import { Button } from "@/components/ui/button";
import "@/index.css";

const moduleId = Number(new URLSearchParams(location.search).get("module") ?? 2);
const source = [
  { id: 1, actif: true, questions: [1, 59].map(id => ({ id, enonce: `Question fictive P1 ${id}` })) },
  { id: 2, actif: true, questions: [59, 72, 73, 74, 75, 76].map(id => ({ id, enonce: `Question fictive P2 ${id}` })) },
];
const presentation = projectT3pLocalPresentation<{ id: number; enonce: string }, (typeof source)[number]>(moduleId, "cours-et-exercices", source);
function Fixture() {
  const [part, setPart] = useState<1 | 2>(1);
  const [answers, setAnswers] = useState<Record<string, string[]>>({ "1-59": ["A"], "2-59": ["B"], "2-73": ["A"] });
  if (!presentation) return <p>Projection refusée</p>;
  return <main className="max-w-4xl mx-auto p-4 space-y-4">
    <nav className="flex gap-2">
      <Button onClick={() => setPart(1)}>Partie 1</Button>
      <Button onClick={() => setPart(2)}>Partie 2</Button>
    </nav>
    <T3pLocalQuestionParts<{ id: number; enonce: string }, (typeof source)[number]> presentation={presentation} part={part} renderQuestion={entry => (
      <div className="border border-border rounded-lg p-4 space-y-2">
        <ExerciseQuestionPrompt questionNumber={Number(entry.question.id)} prompt={{ question: entry.question.enonce }} />
        <QcmChoiceButtons choices={[{ lettre: "A", texte: "Choix A" }, { lettre: "B", texte: "Choix B" }]}
          multi={false} showResults={false} selected={answers[entry.answerKey] ?? []}
          onSelect={letter => setAnswers(prev => ({ ...prev, [entry.answerKey]: [letter] }))} />
      </div>
    )} />
    <output aria-label="Réponses fictives">{JSON.stringify(answers)}</output>
  </main>;
}
const root = document.getElementById("root");
if (root) createRoot(root).render(<Fixture />);