import { it } from "vitest";
import { tousLesExamens } from "@/components/cours-en-ligne/examens-blancs-data";
import { detecterDivergencesCorrection } from "@/components/cours-en-ligne/coherence-questions-reference";
import { BILAN_T3P_QUESTIONS } from "@/components/cours-en-ligne/bilan-questions-t3p";
import { BILAN_SECURITE_QUESTIONS } from "@/components/cours-en-ligne/bilan-questions-securite";
import { BILAN_REGLEMENTATION_VTC_QUESTIONS } from "@/components/cours-en-ligne/bilan-questions-reglementation-vtc";
import { BILAN_FRANCAIS_QUESTIONS } from "@/components/cours-en-ligne/bilan-questions-francais";
import { BILAN_ANGLAIS_QUESTIONS } from "@/components/cours-en-ligne/bilan-questions-anglais";
import { BILAN_GESTION_QUESTIONS } from "@/components/cours-en-ligne/bilan-questions-gestion";
import { BILAN_DEV_COMMERCIAL_QUESTIONS } from "@/components/cours-en-ligne/bilan-questions-dev-commercial";
import { BILAN_EXERCICE_COMPLEMENTAIRE_TAXI_QUESTIONS } from "@/components/cours-en-ligne/bilan-questions-exercice-complementaire-taxi";
import { BILAN_EXERCICE_COMPLEMENTAIRE_VTC_QUESTIONS } from "@/components/cours-en-ligne/bilan-questions-exercice-complementaire-vtc";
it("probe", () => {
  const ref = [BILAN_T3P_QUESTIONS,BILAN_SECURITE_QUESTIONS,BILAN_REGLEMENTATION_VTC_QUESTIONS,BILAN_FRANCAIS_QUESTIONS,BILAN_ANGLAIS_QUESTIONS,BILAN_GESTION_QUESTIONS,BILAN_DEV_COMMERCIAL_QUESTIONS,BILAN_EXERCICE_COMPLEMENTAIRE_TAXI_QUESTIONS,BILAN_EXERCICE_COMPLEMENTAIRE_VTC_QUESTIONS].flat();
  const d = detecterDivergencesCorrection(tousLesExamens, ref);
  console.log("DIV", d.length); for (const x of d) console.log("DIV", JSON.stringify(x));
});
