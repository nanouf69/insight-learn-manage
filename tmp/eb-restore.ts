// RESTAURATION DES EXAMENS BLANCS — contenu éditorial uniquement.
// Chaque numéro est restauré depuis SA PROPRE source d'origine (code).
// Aucune donnée apprenant n'est lue ni écrite.
// Usage : bun run tmp/eb-restore.ts [--apply]
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { tousLesExamens } from "../src/components/cours-en-ligne/examens-blancs-data";

const APPLY = process.argv.includes("--apply");

const EXAM_ID_TO_MODULE_ID: Record<string, number> = {
  EB1: 90000, EB2: 90001, EB3: 90002, EB4: 90003, EB5: 90004, EB6: 90005,
  "EB1-TAXI": 90006, "EB2-TAXI": 90007, "EB3-TAXI": 90008, "EB4-TAXI": 90009, "EB5-TAXI": 90010, "EB6-TAXI": 90011,
  "eb1-ta": 90012, "eb2-ta": 90018, "eb3-ta": 90019, "eb4-ta": 90020, "eb5-ta": 90021, "eb6-ta": 90022,
  "eb1-va": 90013, "eb2-va": 90023, "eb3-va": 90024, "eb4-va": 90025, "eb5-va": 90026, "eb6-va": 90027,
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const examens = clone(tousLesExamens as any[]);
const byId = new Map<string, any>(examens.map((e) => [e.id, e]));

// Groupes autorisés : MÊME NUMÉRO uniquement.
for (let n = 1; n <= 6; n++) {
  const vtc = byId.get(`EB${n}`);
  const taxi = byId.get(`EB${n}-TAXI`);
  const va = byId.get(`eb${n}-va`);
  const ta = byId.get(`eb${n}-ta`);
  if (vtc && taxi) taxi.matieres = [...clone(vtc.matieres.slice(0, 5)), ...taxi.matieres.slice(5)];
  if (vtc && va && vtc.matieres[5] && vtc.matieres[6]) va.matieres = [clone(vtc.matieres[5]), clone(vtc.matieres[6])];
  if (taxi && ta && taxi.matieres[5] && taxi.matieres[6]) ta.matieres = [clone(taxi.matieres[5]), clone(taxi.matieres[6])];
}

let totalQ = 0, totalMat = 0;
const lines: string[] = [];
const payload: { module_id: number; module_data: any }[] = [];
for (const [examId, moduleId] of Object.entries(EXAM_ID_TO_MODULE_ID)) {
  const ex = byId.get(examId);
  if (!ex) { lines.push(`!! source introuvable pour ${examId}`); continue; }
  const nbQ = (ex.matieres ?? []).reduce((a: number, m: any) => a + (m.questions?.length ?? 0), 0);
  totalQ += nbQ; totalMat += ex.matieres?.length ?? 0;
  lines.push(`${examId.padEnd(10)} module ${moduleId} → ${String(ex.matieres?.length ?? 0).padStart(2)} matières, ${String(nbQ).padStart(3)} questions`);
  payload.push({ module_id: moduleId, module_data: ex });
}
console.log(lines.join("\n"));
console.log(`\nTOTAL : ${payload.length} examens, ${totalMat} matières, ${totalQ} questions`);

if (!APPLY) { console.log("\n(dry-run — rien écrit)"); process.exit(0); }

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// Sauvegarde de l'état actuel avant écriture
const { data: before, error: beforeErr } = await supabase
  .from("module_editor_state")
  .select("module_id, module_data, updated_at")
  .in("module_id", payload.map((p) => p.module_id));
if (beforeErr) { console.error("Backup impossible:", beforeErr.message); process.exit(1); }
fs.writeFileSync("/tmp/eb/backup-before-restore.json", JSON.stringify(before, null, 2));
console.log(`Sauvegarde: /tmp/eb/backup-before-restore.json (${before?.length} modules)`);

for (const row of payload) {
  const { error } = await supabase
    .from("module_editor_state")
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "module_id" });
  if (error) { console.error(`ÉCHEC module ${row.module_id}:`, error.message); process.exit(1); }
  console.log(`✓ module ${row.module_id} restauré`);
}
console.log("Restauration terminée.");
