import React from "react";
import { createRoot } from "react-dom/client";
import { RevisionFausses } from "@/components/cours-en-ligne/ExamenBlancsResultats";
import { setAnswerSaveAuthToken, setAnswerSaveOwnership } from "@/lib/answerPersistence";
import "@/index.css";
// Synthetic identity; browser intercepts every request, never a real account/session.
setAnswerSaveAuthToken("isolated-test-token", "22222222-2222-4222-8222-000000000002");
setAnswerSaveOwnership({ apprenantId: "11111111-1111-4111-8111-000000000001", previewReadOnly: false });
const q = { id: 1, type: "QRC" as const, enonce: "Question de contrôle de finalisation", reponseQRC: "texte", reponses_possibles: ["texte"] };
const root = document.getElementById("root");
if (root) createRoot(root).render(<main className="mx-auto max-w-3xl p-4"><RevisionFausses
  wrongQuestions={[{ matiereNom: "Gestion", matiere: { id: "gestion", nom: "Gestion", questions: [q] } as any, question: q }]}
  apprenantId="11111111-1111-4111-8111-000000000001" userId="22222222-2222-4222-8222-000000000002" examenId="EB2-TAXI"
  onTerminer={() => { const marker = document.createElement("p"); marker.textContent = "Résultat serveur confirmé"; document.body.append(marker); }} /></main>);