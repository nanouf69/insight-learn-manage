import { it } from "vitest";
import { readFileSync } from "fs";
import { detecterDivergencesCorrection } from "@/components/cours-en-ligne/coherence-questions-reference";
import * as B from "@/components/cours-en-ligne/bilan-questions-t3p";
import * as S from "@/components/cours-en-ligne/bilan-questions-securite";
import * as R from "@/components/cours-en-ligne/bilan-questions-reglementation-vtc";
import * as F from "@/components/cours-en-ligne/bilan-questions-francais";
import * as A from "@/components/cours-en-ligne/bilan-questions-anglais";
import * as G from "@/components/cours-en-ligne/bilan-questions-gestion";
import * as D from "@/components/cours-en-ligne/bilan-questions-dev-commercial";
import * as T from "@/components/cours-en-ligne/bilan-questions-exercice-complementaire-taxi";
import * as V from "@/components/cours-en-ligne/bilan-questions-exercice-complementaire-vtc";
it("live", () => {
  const ref = [B,S,R,F,A,G,D,T,V].flatMap((m:any)=>Object.values(m).filter(Array.isArray).flat()) as any;
  const live = JSON.parse(readFileSync("/tmp/live.json","utf8").replace(/\\\\/g,"\\"));
  const d = detecterDivergencesCorrection(live, ref);
  console.log("LIVE", d.length); for (const x of d) console.log("LIVE", `${x.examenId}|${x.matiereId}|Q${x.questionId}|${x.enonce.slice(0,60)}|ex=${x.bonnesExamen.join(" + ")}|ref=${x.bonnesReference.join(" + ")}`);
});
