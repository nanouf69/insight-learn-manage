import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { PassageMatiere } from "@/components/cours-en-ligne/ExamenBlancsPassage";
import { setAnswerSaveOwnership, setAnswerSaveAuthToken } from "@/lib/answerPersistence";

setAnswerSaveOwnership({ apprenantId: "apprenant-fictif", previewReadOnly: false });
setAnswerSaveAuthToken("e30.eyJzdWIiOiJ1dGlsaXNhdGV1ci1maWN0aWYifQ.fictif", "utilisateur-fictif");

const matiere: any = {
  id: "t3p",
  nom: "T3P fictif",
  duree: 30,
  noteSur: 20,
  questions: [{
    id: 1,
    type: "QCM",
    enonce: "Question fictive isolée",
    choix: [
      { lettre: "A", texte: "Réponse A" },
      { lettre: "B", texte: "Réponse B" },
    ],
  }],
};

function Harness() {
  const [termine, setTermine] = useState(false);
  return <main>
    <h1>Scénario fictif reset EB</h1>
    <p id="etat">{termine ? "TERMINE" : "EN COURS"}</p>
    <PassageMatiere
      matiere={matiere}
      numero={1}
      total={1}
      apprenantId="apprenant-fictif"
      userId="utilisateur-fictif"
      examenId="EB1-FICTIF"
      tentative={1}
      onTerminer={() => {
        localStorage.setItem("eb_reset_fake_finished", "oui");
        setTermine(true);
      }}
      onSansReponse={() => undefined}
    />
  </main>;
}

createRoot(document.getElementById("root")!).render(<Harness />);
