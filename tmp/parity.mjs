import { runExamensBlancsConsistencyCheck } from "../src/components/cours-en-ligne/examens-blancs-consistency.ts";
const r = runExamensBlancsConsistencyCheck();
console.log("Examens:", r.reports.length, "| Erreurs:", r.totalErrors, "| Avert:", r.totalWarnings, "| Divergences parité:", r.totalParityMismatches);
for (const rep of r.reports) {
  const mm = rep.parities.filter(p => !p.match);
  const otherErrs = rep.issues.filter(i => i.kind !== "answer_parity_mismatch" && i.severity === "error");
  if (mm.length === 0 && otherErrs.length === 0) continue;
  console.log(`\n=== ${rep.examId} — ${rep.examTitre} ===  parité ${rep.parityChecked - rep.parityMismatches}/${rep.parityChecked}, erreurs ${rep.errors}`);
  for (const p of mm.slice(0, 5)) {
    console.log(` ≠ Q${p.questionId} [${p.type}] ${p.matiereNom}: apprenant="${p.learnerExpected}" | admin="${p.adminExpected}"`);
  }
  const kinds = {};
  for (const i of otherErrs) kinds[i.kind] = (kinds[i.kind]||0)+1;
  console.log(" erreurs par type:", kinds);
  for (const i of otherErrs.slice(0, 5)) {
    console.log(` ! Q${i.questionId} [${i.kind}] ${i.matiereNom}: ${i.message.slice(0,120)}`);
  }
}
