// LECTURE SEULE — 1) le contenu enregistré est-il identique entre N°1..N°6 ?
// 2) combien de questions ne correspondent à AUCUNE source (= édition Admin) ?
import fs from "node:fs";
import { tousLesExamens } from "../src/components/cours-en-ligne/examens-blancs-data";

const MODULE_TO_EXAM: Record<number, string> = {
  90000: "EB1", 90001: "EB2", 90002: "EB3", 90003: "EB4", 90004: "EB5", 90005: "EB6",
  90006: "EB1-TAXI", 90007: "EB2-TAXI", 90008: "EB3-TAXI", 90009: "EB4-TAXI", 90010: "EB5-TAXI", 90011: "EB6-TAXI",
  90012: "eb1-ta", 90018: "eb2-ta", 90019: "eb3-ta", 90020: "eb4-ta", 90021: "eb5-ta", 90022: "eb6-ta",
  90013: "eb1-va", 90023: "eb2-va", 90024: "eb3-va", 90025: "eb4-va", 90026: "eb5-va", 90027: "eb6-va",
};
const num = (id: string) => { const m = id.toLowerCase().match(/^eb\s*(\d+)/); return m ? Number(m[1]) : null; };
const fil = (id: string) => { const s = id.toLowerCase(); return s.includes("taxi") ? "TAXI" : s.endsWith("-ta") ? "TA" : s.endsWith("-va") ? "VA" : "VTC"; };
const norm = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const sig = (q: any) => `${norm(q?.type)}::${norm(q?.enonce)}::${(q?.choix ?? []).map((c: any) => `${norm(c?.texte)}${c?.correct ? "*" : ""}`).join("|")}::${norm(q?.reponseQRC)}`;

const rows = JSON.parse(fs.readFileSync("/tmp/eb/rows.json", "utf8"));

// toutes les signatures sources, par matière (toutes filières / tous numéros)
const srcSigs = new Map<string, Map<string, number[]>>(); // matId -> sig -> numeros
for (const ex of tousLesExamens as any[]) {
  const n = num(ex.id);
  for (const m of ex.matieres ?? []) {
    if (!srcSigs.has(m.id)) srcSigs.set(m.id, new Map());
    const bucket = srcSigs.get(m.id)!;
    for (const q of m.questions ?? []) {
      const s = sig(q);
      const arr = bucket.get(s) ?? [];
      if (n !== null && !arr.includes(n)) arr.push(n);
      bucket.set(s, arr);
    }
  }
}

const contentByFilMat = new Map<string, Map<string, number[]>>(); // "VTC|t3p" -> contentHash -> numeros
let adminOnly = 0, total = 0, matchOwn = 0, matchOtherOnly = 0;
const adminSamples: string[] = [];

for (const row of rows) {
  const examId = MODULE_TO_EXAM[row.module_id];
  if (!examId) continue;
  const n = num(examId)!, f = fil(examId);
  for (const m of row.module_data?.matieres ?? []) {
    const qs = m.questions ?? [];
    const hash = JSON.stringify(qs.map(sig));
    const k = `${f}|${m.id}`;
    if (!contentByFilMat.has(k)) contentByFilMat.set(k, new Map());
    const b = contentByFilMat.get(k)!;
    b.set(hash, [...(b.get(hash) ?? []), n]);

    for (const q of qs) {
      total++;
      const nums = srcSigs.get(m.id)?.get(sig(q));
      if (!nums) { adminOnly++; if (adminSamples.length < 40) adminSamples.push(`${f} N°${n} ${m.id} Q${q.id} [${norm(q.type)}] ${norm(q.enonce).slice(0, 80)}`); }
      else if (nums.includes(n)) matchOwn++;
      else matchOtherOnly++;
    }
  }
}

console.log(`Questions enregistrées: ${total}`);
console.log(`  · identiques à la source de LEUR numéro : ${matchOwn}`);
console.log(`  · identiques à la source d'un AUTRE numéro uniquement : ${matchOtherOnly}`);
console.log(`  · ne correspondant à aucune source (édition Admin ou hybride) : ${adminOnly}`);
console.log("\nContenu enregistré identique entre numéros ?");
for (const [k, b] of contentByFilMat) {
  const groups = [...b.values()].map((ns) => ns.sort((a, z) => a - z).join(","));
  console.log(`  ${k.padEnd(28)} → ${b.size} version(s) distincte(s) pour les numéros [${groups.join("] [")}]`);
}
console.log("\nExemples de questions sans source (à conserver/vérifier) :");
for (const s of adminSamples) console.log("  " + s);
