// LECTURE SEULE — Pour chaque matière enregistrée, mesure le taux de
// correspondance avec la source de CHAQUE numéro d'examen (1..6).
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

const rows = JSON.parse(fs.readFileSync("/tmp/eb/rows.json", "utf8"));
const src = new Map<string, any>();
for (const ex of tousLesExamens as any[]) src.set(ex.id, ex);

// pour un id de matière, énoncés par numéro (toutes filières confondues)
function enoncesForNumero(matId: string, n: number): Set<string> {
  const out = new Set<string>();
  for (const ex of tousLesExamens as any[]) {
    if (num(ex.id) !== n) continue;
    const m = (ex.matieres ?? []).find((x: any) => x.id === matId);
    for (const q of m?.questions ?? []) out.add(norm(q.enonce));
  }
  return out;
}

console.log("filiere N° | matière | nbQ | correspondance par numéro source (1..6)");
for (const row of rows) {
  const examId = MODULE_TO_EXAM[row.module_id];
  if (!examId) continue;
  const n = num(examId), f = fil(examId);
  for (const sm of row.module_data?.matieres ?? []) {
    const qs = (sm.questions ?? []).map((q: any) => norm(q.enonce)).filter(Boolean);
    if (!qs.length) continue;
    const scores: string[] = [];
    for (let k = 1; k <= 6; k++) {
      const set = enoncesForNumero(sm.id, k);
      const hit = qs.filter((e: string) => set.has(e)).length;
      scores.push(`${k}:${Math.round((hit / qs.length) * 100)}%`);
    }
    console.log(`${f} N°${n} | ${sm.id.padEnd(20)} | ${String(qs.length).padStart(3)} | ${scores.join("  ")}`);
  }
}
