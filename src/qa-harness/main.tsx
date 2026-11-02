import { createRoot } from "react-dom/client";
import { useState } from "react";
import "@/index.css";
import { ExamQuestionImage } from "@/components/cours-en-ligne/ExamQuestionImage";

const OLD = "w-full aspect-[4/3] overflow-hidden"; // previous default frame, reproduced exactly
const params = new URLSearchParams(location.search);
const img = params.get("img") ?? "square";
const legacy = params.get("legacy") === "1";
const src = img === "none" ? null : `/qa-tmp/${img}.png`;
const old = legacy ? { frameClassName: OLD } : {};
const Choices = () => <div data-choices className="space-y-1.5 ml-2"><button className="w-full border rounded p-2 text-left"><span className="text-sm">A. Réponse</span></button></div>;

function Cases() {
  return <div className="p-4 space-y-8 max-w-5xl">
    {/* 1 learner course/quiz/bilan exercise (ModuleDetailView 9184, non road-safety) */}
    <div data-case="eleve-exercice" data-learner-question className="space-y-2 p-4 border rounded-lg">
      <p className="learner-question-title">Q1. Ce panneau signifie :</p>
      {src && <ExamQuestionImage image={src} alt="i" className="max-h-40 rounded border object-contain ml-2" fallbackClassName="ml-2 text-xs text-muted-foreground italic" {...old} />}
      <p data-after className="text-xs text-muted-foreground italic ml-2">Plusieurs réponses possibles</p><Choices />
    </div>
    {/* 2 learner road-safety (already-fitted path, unchanged) */}
    <div data-case="eleve-securite-routiere" data-learner-question className="space-y-2 p-4 border rounded-lg">
      <p className="learner-question-title">Q9. Ce panneau signifie que le :</p>
      {src && <ExamQuestionImage image={src} alt="i" className="max-h-40 rounded border object-contain ml-2" fallbackClassName="ml-2 text-xs italic" frameClassName="road-safety-question-image" fitFrameToImage />}
      <p data-after className="text-xs italic ml-2">Plusieurs réponses possibles</p><Choices />
    </div>
    {/* 3 learner exam passage (ExamenBlancsPassage 1349) */}
    <div data-case="eleve-examen-blanc" data-learner-question className="border-2 rounded-lg"><div className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-col sm:flex-row items-start gap-3 flex-1 min-w-0"><span className="shrink-0">QCM</span><div className="min-w-0 flex-1">
        <p className="learner-question-title font-medium">Question d'examen blanc avec une illustration</p>
        {src && <ExamQuestionImage image={src} alt="i" className="mt-4 w-full h-auto max-h-[480px] object-contain rounded-lg border" fallbackClassName="mt-3 text-xs italic" {...old} />}
      </div></div><span>1 pt</span></div>
      <div data-after className="space-y-2 ml-2"><Choices /></div>
    </div></div>
    {/* 4 learner Bilan futur (BilanFutureExam 129) */}
    <div data-case="eleve-bilan-futur" className="space-y-2 border rounded p-3"><p>Question bilan</p>
      {src && <ExamQuestionImage image={src} alt="i" className="max-h-72 w-auto rounded" {...old} />}<div data-after><Choices /></div></div>
    {/* 5 learner FC VTC end bilan (BilanFinFormationFCVtc 48) */}
    <div data-case="eleve-bilan-fc" className="border rounded p-3"><p>Question FC</p>
      {src && <div className="my-3"><ExamQuestionImage image={src} alt="i" className="max-h-48 rounded-lg border" fallbackClassName="text-xs italic" {...old} /></div>}
      <ul data-after className="space-y-1.5 mt-2"><li>A. Réponse</li></ul></div>
    {/* 6 results detail (ExamenBlancsResultats 1638) */}
    <div data-case="resultats-detail" className="space-y-4 border rounded p-3"><p>Q</p>
      {src && <ExamQuestionImage image={src} alt="i" className="mt-2 max-h-40 rounded-lg border" fallbackClassName="mt-2 text-xs italic" {...old} />}
      <div data-after className="space-y-2"><Choices /></div></div>
    {/* 7 results/correction list (ExamenBlancsResultats 934) */}
    <div data-case="resultats-liste" className="border rounded p-3 flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><div><p className="text-sm font-bold">Q1. Question</p></div>
      {src && <ExamQuestionImage image={src} alt="i" className="mt-1 max-h-24 rounded border" fallbackClassName="mt-1 text-xs italic" {...old} />}
      <p data-after className="text-xs">Réponse élève : A</p></div><span>1/1</span></div>
    {/* 8 admin EB editor (ExamensBlancsEditor 1301) */}
    <div data-case="admin-editeur-eb" className="flex items-start gap-3 border rounded p-3"><span>QCM — Q1</span><div className="flex-1 min-w-0"><p>Enoncé</p>
      {src && <ExamQuestionImage image={src} alt="i" className="mt-2 max-h-32 rounded border" fallbackClassName="mt-2 text-xs italic" {...old} />}
      <div data-after className="text-xs">A. Réponse</div></div><span>1 pt</span></div>
    {/* 9 admin module list thumbnail (ModuleDetailView 3681, non road-safety) */}
    <div data-case="admin-liste-vignette" className="flex items-start gap-3 p-3 border rounded-lg"><span className="shrink-0">Q1</span>
      {src && <ExamQuestionImage image={src} alt="i" className="w-20 h-20 object-contain rounded border shrink-0 bg-white" fallbackClassName="hidden" {...old} />}
      <div data-after data-beside className="flex-1"><p className="text-sm">Enoncé de la question</p></div></div>
    {/* 10 admin module fullscreen (ModuleDetailView 3808, non road-safety) */}
    <div data-case="admin-plein-ecran" className="flex items-start gap-3 p-4 border rounded-lg"><span>Q1</span><div className="flex-1 min-w-0"><p className="text-xl font-semibold mb-3">Enoncé</p>
      {src && <ExamQuestionImage image={src} alt="i" className="max-h-48 object-contain rounded border mb-3 bg-white cursor-zoom-in" fallbackClassName="mb-3 text-xs italic" {...old} />}
      <div data-after className="flex flex-wrap gap-2"><span>A. Réponse</span></div></div></div>
    {/* 11 admin question editor preview (QuestionImageUpload 83, sm) */}
    <div data-case="admin-apercu-edition" className="space-y-2 border rounded p-3"><div className="relative inline-block">
      {src && <ExamQuestionImage image={src} alt="i" className="max-h-32 rounded border object-contain" fallbackClassName="text-xs italic" {...old} />}
      <button className="absolute -top-2 -right-2 h-6 w-6 rounded-full border">x</button></div><div data-after>Taille</div></div>
  </div>;
}
function App() {
  const [show, setShow] = useState(true);
  return <div><button id="toggle" onClick={() => setShow((s) => !s)}>toggle</button>{show && <Cases />}</div>;
}
createRoot(document.getElementById("root")!).render(<App />);
