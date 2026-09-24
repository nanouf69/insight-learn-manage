// Non-régression — EB2 G(V) Q5 « Le renouvellement de l'inscription au registre des VTC »
// Bonne réponse officielle (confirmée le 24/09/2026) : C seul, « tous les 5 ans ».
// La réponse B « tous les ans » avait été marquée correcte par erreur le 19/05.
import { describe, it, expect } from "vitest";
import { tousLesExamens, type Matiere } from "@/components/cours-en-ligne/examens-blancs-data";
import { BILAN_REGLEMENTATION_VTC_QUESTIONS } from "@/components/cours-en-ligne/bilan-questions-reglementation-vtc";
import * as B1 from "@/components/cours-en-ligne/bilan-questions-t3p";
import * as B2 from "@/components/cours-en-ligne/bilan-questions-securite";
import * as B3 from "@/components/cours-en-ligne/bilan-questions-reglementation-vtc";
import * as B4 from "@/components/cours-en-ligne/bilan-questions-francais";
import * as B5 from "@/components/cours-en-ligne/bilan-questions-anglais";
import * as B6 from "@/components/cours-en-ligne/bilan-questions-gestion";
import * as B7 from "@/components/cours-en-ligne/bilan-questions-dev-commercial";
import * as B8 from "@/components/cours-en-ligne/bilan-questions-exercice-complementaire-taxi";
import * as B9 from "@/components/cours-en-ligne/bilan-questions-exercice-complementaire-vtc";
import {
  bonnesReponsesTexte,
  detecterDivergencesCorrection,
  normaliserTexte,
} from "@/components/cours-en-ligne/coherence-questions-reference";
import {
  computeMatiereScoreFromReponses,
  resolveMatiereForScoring,
} from "@/components/cours-en-ligne/examens-blancs-scoring";

const ENONCE = "Le renouvellement de l'inscription au registre des VTC doit avoir lieu :";
const REFERENCE = [B1, B2, B3, B4, B5, B6, B7, B8, B9].flatMap((m: any) =>
  Object.values(m).filter(Array.isArray).flat(),
) as any[];

function gv(examId: string): Matiere {
  const ex = tousLesExamens.find((e) => e.id === examId)!;
  return ex.matieres.find((m) => m.id === "reglementation_vtc2")!;
}
const q5 = (m: Matiere) => m.questions.find((q) => q.enonce === ENONCE)!;

describe("EB2 G(V) Q5 — clé unique C", () => {
  it("1. EB2 et EB2-VA : une seule bonne réponse, C « tous les 5 ans » ; B n'est pas correcte", () => {
    for (const id of ["EB2", "eb2-va"]) {
      const q = q5(gv(id)) as any;
      expect(q, id).toBeTruthy();
      const bonnes = q.choix.filter((c: any) => c.correct === true);
      expect(bonnes.map((c: any) => c.lettre), id).toEqual(["C"]);
      expect(bonnes[0].texte).toBe("tous les 5 ans");
      expect(q.choix.find((c: any) => c.lettre === "B").correct, id).not.toBe(true);
    }
  });

  it("2. mêmes bonnes réponses que la banque de référence ; B + C serait refusé", () => {
    const ref = BILAN_REGLEMENTATION_VTC_QUESTIONS.find((q) => normaliserTexte(q.enonce) === normaliserTexte(ENONCE))!;
    expect(bonnesReponsesTexte(ref)).toEqual(["tous les 5 ans"]);
    for (const id of ["EB2", "eb2-va"]) {
      expect(bonnesReponsesTexte(q5(gv(id)))).toEqual(bonnesReponsesTexte(ref));
    }
    // Garde-fou : une version B + C est bien détectée comme divergente.
    const fautive = structuredClone(tousLesExamens.find((e) => e.id === "EB2")!);
    const qf = fautive.matieres.find((m) => m.id === "reglementation_vtc2")!.questions.find((q) => q.enonce === ENONCE) as any;
    qf.choix.find((c: any) => c.lettre === "B").correct = true;
    const d = detecterDivergencesCorrection([fautive], REFERENCE);
    expect(d.some((x) => x.matiereId === "reglementation_vtc2" && normaliserTexte(x.enonce) === normaliserTexte(ENONCE))).toBe(true);
  });

  it("3. contrôle générique : aucune NOUVELLE divergence de correction avec la référence", () => {
    // Divergences préexistantes au 24/09/2026, figées pour décision séparée de l'admin.
    // Toute divergence absente de cette liste fait échouer le test.
    const CONNUES = new Set<string>([
"EB1|t3p|11",
"EB1|gestion|7",
"EB1|gestion|8",
"EB1|gestion|10",
"EB1|reglementation_vtc|6",
"EB1|reglementation_vtc2|4",
"EB2|gestion|10",
"EB2|gestion|12",
"EB2|gestion|18",
"EB2|securite|13",
"EB2|reglementation_vtc|14",
"EB2|reglementation_vtc|16",
"EB3|t3p|10",
"EB3|francais|4",
"EB3|francais|8",
"EB3|anglais|8",
"EB3|anglais|12",
"EB3|reglementation_vtc|6",
"EB3|reglementation_vtc2|6",
"EB4|t3p|13",
"EB4|gestion|17",
"EB4|reglementation_vtc2|6",
"EB5|gestion|5",
"EB5|gestion|8",
"EB5|anglais|19",
"EB6|reglementation_vtc|6",
"EB6|reglementation_vtc|15",
"EB1-TAXI|t3p|11",
"EB1-TAXI|gestion|7",
"EB1-TAXI|gestion|8",
"EB1-TAXI|gestion|10",
"EB2-TAXI|gestion|10",
"EB2-TAXI|gestion|12",
"EB2-TAXI|gestion|18",
"EB2-TAXI|securite|13",
"EB3-TAXI|t3p|10",
"EB3-TAXI|francais|4",
"EB3-TAXI|francais|8",
"EB3-TAXI|anglais|8",
"EB3-TAXI|anglais|12",
"EB4-TAXI|t3p|13",
"EB4-TAXI|gestion|17",
"EB5-TAXI|gestion|5",
"EB5-TAXI|gestion|8",
"EB5-TAXI|anglais|19",
"eb1-va|reglementation_vtc|6",
"eb1-va|reglementation_vtc2|4",
"eb2-va|reglementation_vtc|14",
"eb2-va|reglementation_vtc|16",
"eb3-va|reglementation_vtc|6",
"eb3-va|reglementation_vtc2|6",
"eb4-va|reglementation_vtc2|6",
"eb6-va|reglementation_vtc|6",
"eb6-va|reglementation_vtc|15",
"bilan-taxi|bilan_gestion|68",
"bilan-taxi|bilan_gestion|69",
"bilan-taxi|bilan_gestion|70",
"bilan-taxi|bilan_gestion|135",
"bilan-taxi|bilan_reglementation_taxi|48",
"bilan-vtc|bilan_gestion|68",
"bilan-vtc|bilan_gestion|69",
"bilan-vtc|bilan_gestion|70",
"bilan-vtc|bilan_gestion|135",
"bilan-ta|bilan_reglementation_taxi|48",
    ]);
    const actuelles = detecterDivergencesCorrection(tousLesExamens, REFERENCE).map(
      (x) => `${x.examenId}|${x.matiereId}|${x.questionId}`,
    );
    const nouvelles = actuelles.filter((k) => !CONNUES.has(k));
    expect(nouvelles).toEqual([]);
    // Q5 n'est plus divergente ni dans EB2 ni dans EB2-VA.
    expect(actuelles.filter((k) => /^(EB2|eb2-va)\|reglementation_vtc2\|5$/.test(k))).toEqual([]);
  });

  it("4. un passage figé avec l'ancienne clé B + C garde exactement sa note (historique non réécrit)", () => {
    const actuelle = gv("EB2");
    const snapQuestions = structuredClone(actuelle.questions) as any[];
    snapQuestions.find((q) => q.enonce === ENONCE).choix.find((c: any) => c.lettre === "B").correct = true;
    const details = {
      snapshot: { version: 1, matiereId: actuelle.id, nom: actuelle.nom, ptsQCM: 2, ptsQRC: 4, noteSur: 20, questions: snapQuestions },
    };
    // Réponses identiques à celles du passage de SILLA Gils (21/09/2026).
    const reponses = { "1": "x", "2": "Rouge", "3": ["B"], "4": ["A"], "5": ["C"], "6": ["C"], "7": ["B"], "8": ["C"] };
    const corrections: any = {
      "1": { pointsObtenus: 1, validatedByAdmin: true, manuel: true },
      "2": { pointsObtenus: 2, validatedByAdmin: true, manuel: true },
    };
    const figee = resolveMatiereForScoring(actuelle, details);
    const scoreFige = computeMatiereScoreFromReponses(figee, reponses, corrections)!;
    // Le calcul relit la clé FIGÉE (B + C) : Q5 à 0, soit 13/20 — comme avant la correction de la source.
    expect(scoreFige.scoreObtenu).toBe(13);
    // La même copie sur la source corrigée (C seul) donnerait 15 : la correction ne s'applique qu'aux futurs passages.
    const scoreSource = computeMatiereScoreFromReponses(actuelle, reponses, corrections)!;
    expect(scoreSource.scoreObtenu).toBe(15);
  });
});
