/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { isExamAttemptPublicationPending } from "@/components/cours-en-ligne/exam-helpers";
import fs from "node:fs";
import path from "node:path";

const examen = {
  matieres: [
    { id: "gestion", nom: "B - Gestion", questions: [{ id: 1, type: "QRC" }, { id: 2, type: "QRC" }] },
    { id: "securite", nom: "C - Sécurité", questions: [{ id: 3, type: "QCM" }] },
  ],
};
const correction = (validatedByAdmin: boolean) => ({ validatedByAdmin });
const rows = (correctionsIA: Record<string, any>) => [
  { matiereId: "gestion", reponses: { 1: "Réponse 1", 2: "Réponse 2" }, correctionsIA },
  { matiereId: "securite", reponses: { 3: ["A"] } },
];

describe("Publication atomique des résultats d'Examens Blancs", () => {
  it("0 QRC corrigée : aucun bilan", () => {
    expect(isExamAttemptPublicationPending(rows({}), examen)).toBe(true);
  });
  it("correction partielle : aucun bilan", () => {
    expect(isExamAttemptPublicationPending(rows({ 1: correction(true), 2: correction(false) }), examen)).toBe(true);
  });
  it("dernière QRC corrigée : bilan publié", () => {
    expect(isExamAttemptPublicationPending(rows({ 1: correction(true), 2: correction(true) }), examen)).toBe(false);
  });
  it("F5 et reconnexion conservent exactement le même état", () => {
    const persisted = JSON.parse(JSON.stringify(rows({ 1: correction(true) })));
    expect(isExamAttemptPublicationPending(persisted, examen)).toBe(true);
    expect(isExamAttemptPublicationPending(JSON.parse(JSON.stringify(persisted)), examen)).toBe(true);
  });
  it("une ligne historique en attente verrouille tout le passage", () => {
    expect(isExamAttemptPublicationPending([{
      matiere_id: "gestion",
      details: { qrc_pending_correction: true, questions: [{ questionId: 1, type: "QRC", reponseEleve: "x" }], correctionsIA: {} },
    }])).toBe(true);
  });

  it("toutes les surfaces chiffrées utilisent le verrou commun", () => {
    const files = [
      "src/components/cours-en-ligne/ExamenBlancsResultats.tsx",
      "src/components/cours-en-ligne/ExamenBlancsListe.tsx",
      "src/components/cours-en-ligne/NotesView.tsx",
      "src/components/cours-en-ligne/ResultatsSessionPage.tsx",
      "src/components/crm/apprenant-sections/ResultatsApprenantTab.tsx",
      "src/components/crm/apprenant-sections/ControleQualiteTab.tsx",
    ];
    files.forEach((file) => {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
      expect(source, file).toContain("isExamAttemptPublicationPending");
    });
  });
});