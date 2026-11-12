// Disposable presentation fixtures: no account, no hosted request, no real signature.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { genererPdfPresentation } from "@/lib/attestationFinValidee/pdfPresentation";
import { ApercuPdfAttestation } from "@/components/crm/attestation-fin-validee/ApercuPdfAttestation";
import { QuestionsFaussesEffectuees } from "@/components/cours-en-ligne/QuestionsFaussesEffectuees";
import { Button } from "@/components/ui/button";
import "@/index.css";
function Harness() {
  const [blob, setBlob] = useState<Blob | null>(null);
  const exportPdf = async (complete: boolean) => {
    const b = await genererPdfPresentation({ apprenantId: "fixture", prenom: "Camille", nom: "EXEMPLE FICTIF", formation: "VTC", modalite: "e-learning",
      debut: "2026-09-14", fin: "2026-10-19", dateEmission: "2026-11-12", sourceFin: "connexion fictive vérifiée du 19/10/2026 à 14:30",
      motifs: complete ? [] : ["Parcours incomplet"], preuve: complete ? { apprenantId: "fixture", sourceId: "fixture-only", verifieLe: "2026-11-12T17:01:00Z", jalonsObligatoires: 7, jalonsValides: 7, validationsRequisesConfirmees: true } : null });
    setBlob(b);
  };
  return <main className="max-w-3xl mx-auto p-4 space-y-4">
    <Button onClick={() => void exportPdf(false)}>Brouillon incomplet</Button>
    <Button onClick={() => void exportPdf(true)}>Brouillon complet fictif</Button>
    <Button className="w-full h-auto min-h-11 whitespace-normal">Refaire uniquement les questions fausses (45 questions)</Button>
    <QuestionsFaussesEffectuees confirme />
    <ApercuPdfAttestation blob={blob} onClose={() => setBlob(null)} />
  </main>;
}
const root = document.getElementById("root"); if (root) createRoot(root).render(<Harness />);