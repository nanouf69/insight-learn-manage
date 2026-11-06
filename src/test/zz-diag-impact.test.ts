// DIAGNOSTIC TEMPORAIRE (lecture seule, copie locale) — à supprimer.
import { describe, it, vi } from "vitest";
import fs from "node:fs";
const rd = (f: string) => JSON.parse(fs.readFileSync(`/tmp/diag2/${f}.json`, "utf8")) ?? [];
const T: Record<string, any[]> = {
  exam_attempts_v2: rd("attempts"), qrc_instances_v2: rd("qrcs"), core_exam_results: rd("results"),
  core_tentatives_neutralisees: (rd("neut") as string[]).map((attempt_id) => ({ attempt_id })), apprenant_quiz_results: rd("legacy"), answer_state: rd("as"),
};
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (t: string) => {
  let ids: string[] | null = null; let col = "";
  const q: any = {}; for (const m of ["select", "eq", "order"]) q[m] = () => q;
  q.in = (c: string, v: string[]) => { col = c; ids = v; return q; };
  q.range = async (f: number) => ({ data: f === 0 ? (T[t] ?? []).filter((r) => !ids || ids.includes(r[col])) : [], error: null }); return q;
} } }));
import { fetchCoreMatiereStatesBulk, matchCoreState } from "@/lib/coreExamPublication";
import { fetchPassagesV2NonFiables, verifierPassageV2, verifierContenuPassage, contenuFicheTronqueCompatible } from "@/lib/passagesV2NonFiables";
import { attacherSourceUnique, noteExamenAffichee } from "@/lib/noteExamenAffichee";

describe("diag", () => { it("impact", async () => {
  const ids = Array.from(new Set(T.apprenant_quiz_results.map((r) => r.apprenant_id)));
  const map = (await fetchCoreMatiereStatesBulk(ids))!;
  await fetchPassagesV2NonFiables(map);
  let flips = 0, attente = 0; const ex: string[] = [];
  for (const row of T.apprenant_quiz_results) {
    const st = map.get(row.apprenant_id) ?? [];
    const core = matchCoreState(st, row.quiz_id, row.matiere_id, row.completed_at, row.id, row.tentative, row.apprenant_id);
    const r = attacherSourceUnique({ ...row }, st, new Set());
    const n = noteExamenAffichee(r);
    if (n.etat === "en_attente") attente++;
    if (core && r.__core && !core.pending && core.qrcTotal > 0 && verifierPassageV2(core, row.details?.reponses) === "fiable"
      && !contenuFicheTronqueCompatible(core, row.details) && !verifierContenuPassage(core, row.details)) {
      flips++; ex.push(`${row.apprenant_id.slice(0, 8)} ${row.quiz_id} ${row.matiere_id} -> ${n.note20}`);
    }
  }
  console.log("IMPACT lignes", T.apprenant_quiz_results.length, "basculent vers note serveur", flips, "restent en attente", attente);
  console.log("IMPACT ex", ex.join(" | "));
}, 120000); });
