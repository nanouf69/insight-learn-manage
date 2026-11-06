import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { RevisionFausses } from "@/components/cours-en-ligne/ExamenBlancsResultats";
import { setAnswerSaveAuthToken, setAnswerSaveOwnership } from "@/lib/answerPersistence";

setAnswerSaveOwnership({ apprenantId: "apprenant-fictif", previewReadOnly: false });
setAnswerSaveAuthToken("e30.eyJzdWIiOiJ1dGlsaXNhdGV1ci1maWN0aWYifQ.fictif", "utilisateur-fictif");
const wrongQuestions: any[] = [
  { matiereNom: "T3P", matiere: { id: "t3p", questions: [] }, question: { id: 1, type: "QCM", enonce: "Question T3P fictive", choix: [
    { lettre: "A", texte: "Réponse A", correct: false }, { lettre: "B", texte: "Réponse B", correct: true },
  ] } },
  { matiereNom: "Gestion", matiere: { id: "gestion", questions: [] }, question: { id: 1, type: "QRC", enonce: "Question Gestion fictive", reponseQRC: "texte", reponses_possibles: ["texte"] } },
];
wrongQuestions[0].matiere.questions = [wrongQuestions[0].question];
wrongQuestions[1].matiere.questions = [wrongQuestions[1].question];
function Harness() {
  const [finished, setFinished] = useState(false);
  return <main><h1>Révision fictive isolée</h1><p id="etat">{finished ? "TERMINE" : "EN COURS"}</p>
    <RevisionFausses wrongQuestions={wrongQuestions} apprenantId="apprenant-fictif" userId="utilisateur-fictif" examenId="EB2-TAXI"
      onTerminer={() => { localStorage.setItem("revision_fake_finished", "oui"); setFinished(true); }} />
  </main>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
