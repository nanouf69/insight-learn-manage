// Test-only entry: fictitious EB4 VTC F(V) copy; the browser blocks every backend call.
import React from "react";
import { createRoot } from "react-dom/client";
import { RevisionPhaseView } from "@/components/cours-en-ligne/ExamensBlancsPage";
import "@/index.css";
const DOUBLE = "coût de revient + marge + TVA coût de revient + marge + TVA";
const mode = new URLSearchParams(location.search).get("cas") ?? "cosmetique";
const ch = (b: string, ok = "B") => ["A", "B", "C"].map(l => ({ lettre: l, texte: l === "B" ? b : `proposition ${l}`, correct: l === ok }));
const q13 = (b: string, ok = "B") => ({ id: 13, type: "QCM", enonce: "Le prix de vente d'une prestation doit être égal au", points: 1, choix: ch(b, ok) });
const q12 = { id: 12, type: "QCM", enonce: "Question témoin 12", points: 1, choix: ch("bonne 12") };
const actuelle = mode === "echange"
  ? { ...q13(DOUBLE), choix: [{ lettre: "A", texte: DOUBLE, correct: false }, { lettre: "B", texte: "proposition A", correct: true }, { lettre: "C", texte: "proposition C", correct: false }] }
  : q13("coût de revient + marge + TVA");
const examen = { id: "EB4", titre: "EB4 VTC (fictif)", type: "VTC", matieres: [{ id: "fv", nom: "F(V) fictive", duree: 30, coefficient: 1, noteEliminatoire: 6, noteSur: 20, questions: [actuelle, q12] }] } as any;
// Dernière tentative (t2) seule fournie, comme le fait l'écran amont ; t1 avait d'autres réponses.
const t2 = { resultId: "fictif-t2", matiereId: "fv", tentative: 2, reponses: { 12: ["A"], 13: ["A"] }, __core: { attemptId: "fictif-attempt-t2", questions: [{ ...q13(DOUBLE), id: "fv:13" }, { ...q12, id: "fv:12" }] } } as any;
(window as any).__snapshotAvant = JSON.stringify(t2);
const root = document.getElementById("root");
if (root) createRoot(root).render(<main className="mx-auto max-w-3xl p-4"><RevisionPhaseView examenChoisi={examen} tousResultats={[t2]} apprenantId="11111111-1111-4111-8111-000000000001" userId="22222222-2222-4222-8222-000000000002" onRetour={() => {}} /><pre id="snap" hidden>{JSON.stringify(t2)}</pre></main>);
