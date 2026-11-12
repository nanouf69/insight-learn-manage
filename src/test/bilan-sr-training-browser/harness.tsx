import React from "react";
import { createRoot } from "react-dom/client";
import { BilanSrTraining } from "@/components/cours-en-ligne/BilanSrTraining";
import { supabase } from "@/integrations/supabase/client";
import "@/index.css";
const type = new URLSearchParams(location.search).get("type") === "future" ? "future" : "snapshot";
const fixture = { source_id: "fictif", source_type: type, editor_at: "2026-11-12T10:30:30Z", unavailable: 0, questions: [
 { uid: "truck", id: 71, enonce: "Sur une route étroite, un camion arrive en face. Dois-je lui céder le passage ?", choix: [{ lettre: "A", texte: "Oui" }, { lettre: "B", texte: "Non" }], correct: ["B"], answer: ["A"] },
 { uid: "alcohol", id: 226, enonce: "Vous avez consommé de l’alcool. A l’issue d’un contrôle routier, votre taux est de 0,29 mg par litre d’air expiré. Que se passe-t-il ?", choix: [{ lettre: "C", texte: "c’est un délit passible de poursuites judiciaires" }, { lettre: "D", texte: "vous avez une contravention et une perte de 6 points" }], correct: ["D"], answer: ["C", "D"] },
] };
(window as any).testCalls = [];
(supabase as any).rpc = async (name: string) => { (window as any).testCalls.push(name); return { data: name === "bilan_vtc_sr_training_read" ? fixture : null, error: null }; };
const root = document.getElementById("root");
if (root) createRoot(root).render(<main className="max-w-4xl mx-auto p-4"><BilanSrTraining sourceType={type} sourceId="fictif" /></main>);