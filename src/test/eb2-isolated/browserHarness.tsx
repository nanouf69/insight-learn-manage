import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { RevisionFausses } from "./RevisionFaussesCandidate";
import { setAnswerSaveAuthToken, setAnswerSaveOwnership } from "@/lib/answerPersistence";
import "./browserTransport";

setAnswerSaveOwnership({ apprenantId: "fixture-app", previewReadOnly: false });
setAnswerSaveAuthToken("fixture-only", "fixture-user");
const track = new URLSearchParams(location.search).get("track") ?? "VTC";
const ids = ["t3p", "gestion", "securite", "francais", "anglais", "specifique-f", "specifique-g"];
const wrongQuestions: any[] = ids.map((id, index) => {
  const question = index % 2 === 0
    ? { id: 1, type: "QCM", enonce: `${track} ${id} fictif`, choix: [{ lettre: "A", texte: "Réponse A", correct: false }, { lettre: "B", texte: "Réponse B", correct: true }] }
    : { id: 1, type: "QRC", enonce: `${track} ${id} fictif`, reponseQRC: "texte", reponses_possibles: ["texte"] };
  return { question, matiere: { id, questions: [question] }, matiereNom: id };
});
function Harness() {
  const [finished, setFinished] = useState(false);
  return <main><p role="status">{finished ? "TERMINE" : "EN COURS"}</p>
    <RevisionFausses wrongQuestions={wrongQuestions} apprenantId="fixture-app" userId="fixture-user"
      examenId={`EB2-${track}`} onTerminer={() => setFinished(true)} />
  </main>;
}
const root = document.getElementById("root");
if (root) createRoot(root).render(<Harness />);