import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { isExamAttemptPublicationPending } from "@/components/cours-en-ligne/exam-helpers";

const examen = { matieres: [{ id: "t3p", nom: "A - T3P", questions: [{ id: 1, type: "QRC" }] }] };
// État serveur V2 (core_exam_results) : définitif dès que qrc_restantes = 0,
// que les QRC aient été corrigées par l'IA ou par un formateur.
const ligne = (pending: boolean, note20: number | null) => ({
  matiereId: "t3p", nomMatiere: "A - T3P", reponses: { 1: "réponse" },
  details: { reponses: { 1: "réponse" } }, // aucune correction dans l'ancien système
  __core: { attemptId: "x", pending, note20, qrcRestantes: pending ? 1 : 0 },
});

describe("Publication de la note : QRC corrigées par IA", () => {
  it("matière terminée + toutes QRC corrigées IA → note visible, pas d'attente, aucune validation formateur", () => {
    expect(isExamAttemptPublicationPending([ligne(false, 15)], examen)).toBe(false);
  });
  it("matière avec au moins 1 QRC réellement en attente → En attente", () => {
    expect(isExamAttemptPublicationPending([ligne(true, null)], examen)).toBe(true);
  });
  it("aucun texte élève ne présente la validation formateur comme obligatoire", () => {
    for (const f of ["ExamenBlancsListe.tsx", "ExamenBlancsResultats.tsx"]) {
      const s = readFileSync(join(process.cwd(), "src/components/cours-en-ligne", f), "utf8");
      expect(s).not.toContain("validation de toutes les QRC par le formateur");
      expect(s).not.toContain("En attente de validation du formateur");
      expect(s).not.toContain("corrigées par votre formateur");
      expect(s).not.toContain("après la validation de votre formateur");
    }
  });
});
