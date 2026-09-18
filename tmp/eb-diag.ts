// Diagnostic LECTURE SEULE des examens blancs : compare le contenu enregistré
// (module_editor_state) à la source de SON PROPRE numéro d'examen, et repère
// les contenus qui proviennent en réalité d'un AUTRE numéro.
import fs from "node:fs";
import { tousLesExamens } from "../src/components/cours-en-ligne/examens-blancs-data";

const MODULE_TO_EXAM: Record<number, string> = {
  90000: "EB1", 90001: "EB2", 90002: "EB3", 90003: "EB4", 90004: "EB5", 90005: "EB6",
  90006: "EB1-TAXI", 90007: "EB2-TAXI", 90008: "EB3-TAXI", 90009: "EB4-TAXI", 90010: "EB5-TAXI", 90011: "EB6-TAXI",
  90012: "eb1-ta", 90018: "eb2-ta", 90019: "eb3-ta", 90020: "eb4-ta", 90021: "eb5-ta", 90022: "eb6-ta",
  90013: "eb1-va", 90023: "eb2-va", 90024: "eb3-va", 90025: "eb4-va", 90026: "eb5-va", 90027: "eb6-va",
};

const num = (examId: string) => {
  const m = String(examId).toLowerCase().match(/^eb\s*(\d+)/);
  return m ? Number(m[1]) : null;
};
const fil = (examId: string) => {
  const id = String(examId).toLowerCase();
  if (id.includes("taxi")) return "TAXI";
  if (id.endsWith("-ta")) return "TA";
  if (id.endsWith("-va")) return "VA";
  return "VTC";
};

const norm = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const sigChoix = (q: any) =>
  Array.isArray(q?.choix)
    ? q.choix.map((c: any) => `${norm(c?.texte)}${c?.correct ? "*" : ""}`).join("|")
    : "";
const sigQ = (q: any) => `${norm(q?.type)}::${norm(q?.enonce)}::${sigChoix(q)}::${norm(q?.reponseQRC)}::${q?.points ?? ""}`;

const src = new Map<string, any>(); // examId -> exam
for (const ex of tousLesExamens as any[]) src.set(ex.id, ex);

const rows = JSON.parse(fs.readFileSync("/tmp/eb/rows.json", "utf8"));

type Finding = {
  examId: string; filiere: string; numero: number | null; matiereId: string; matiereNom: string;
  qid: any; kind: string; detail: string; fromNumero?: number | null;
};
const findings: Finding[] = [];
let totalQ = 0, okQ = 0;

for (const row of rows) {
  const examId = MODULE_TO_EXAM[row.module_id];
  if (!examId) continue;
  const saved = row.module_data;
  const source = src.get(examId);
  if (!saved?.matieres || !source) continue;
  const n = num(examId), f = fil(examId);

  for (const sm of saved.matieres) {
    const srcMat = (source.matieres ?? []).find((m: any) => m.id === sm.id);
    for (const q of sm.questions ?? []) {
      totalQ++;
      const own = srcMat?.questions?.find((sq: any) => Number(sq.id) === Number(q.id));
      if (own && sigQ(own) === sigQ(q)) { okQ++; continue; }

      // chercher d'où vient ce contenu : même matiere id dans un AUTRE numéro
      let origin: { numero: number | null; filiere: string; qid: any } | null = null;
      for (const other of tousLesExamens as any[]) {
        if (other.id === examId) continue;
        const on = num(other.id);
        if (on === n) continue; // même numéro = partage légitime
        const om = (other.matieres ?? []).find((m: any) => m.id === sm.id);
        if (!om) continue;
        const hit = (om.questions ?? []).find((oq: any) => sigQ(oq) === sigQ(q));
        if (hit) { origin = { numero: on, filiere: fil(other.id), qid: hit.id }; break; }
      }

      // énoncé d'un numéro + propositions d'un autre => hybride
      let hybride = false;
      if (own && norm(own.enonce) !== norm(q.enonce)) {
        for (const other of tousLesExamens as any[]) {
          const on = num(other.id);
          if (on === n) continue;
          const om = (other.matieres ?? []).find((m: any) => m.id === sm.id);
          const hit = (om?.questions ?? []).find((oq: any) => norm(oq.enonce) === norm(q.enonce));
          if (hit && sigChoix(hit) !== sigChoix(q)) { hybride = true; break; }
        }
      }

      const kind = !own
        ? "question_absente_de_la_source"
        : origin
        ? "contenu_d_un_autre_numero"
        : hybride
        ? "hybride"
        : norm(own.type) !== norm(q.type)
        ? "type_different_de_la_source"
        : "modification_admin_ou_divergence_locale";

      findings.push({
        examId, filiere: f, numero: n, matiereId: sm.id, matiereNom: sm.nom, qid: q.id, kind,
        fromNumero: origin?.numero ?? null,
        detail: `saved[${norm(q.type)}] "${norm(q.enonce).slice(0, 90)}" | source${n}[${own ? norm(own.type) : "—"}] "${own ? norm(own.enonce).slice(0, 90) : "—"}"`,
      });
    }
  }
}

const byKind: Record<string, number> = {};
for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
console.log(`Questions enregistrées: ${totalQ} | identiques à leur propre source: ${okQ} | écarts: ${findings.length}`);
console.log("Par type:", byKind);
for (const f of findings.filter((x) => x.kind === "contenu_d_un_autre_numero" || x.kind === "hybride" || x.kind === "type_different_de_la_source")) {
  console.log(`\n[${f.kind}] ${f.filiere} N°${f.numero} — ${f.matiereNom} (${f.matiereId}) Q${f.qid}${f.fromNumero ? ` ← N°${f.fromNumero}` : ""}`);
  console.log("   " + f.detail);
}
fs.writeFileSync("/tmp/eb/findings.json", JSON.stringify(findings, null, 2));
