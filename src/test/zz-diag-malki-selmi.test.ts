import { it, vi } from "vitest";
import fs from "fs";
const D = (f: string) => JSON.parse(fs.readFileSync(`/tmp/diag/${f}.json`, "utf8"));
const tables: Record<string, any[]> = { exam_attempts_v2: D("attempts"), qrc_instances_v2: D("qrcs"), core_exam_results: D("results"), core_tentatives_neutralisees: D("neutres"), apprenant_quiz_results: D("legacy"), answer_state: D("answers") };
vi.mock("@/integrations/supabase/client", () => {
  const q = (t: string) => { let rows = tables[t]; const o: any = { select: () => o, in: (k: string, v: any[]) => { if (t !== "answer_state" || k === "attempt_id") rows = rows.filter((r) => v.includes(r[k])); return o; }, eq: (k: string, v: any) => { rows = rows.filter((r) => r[k] === v); return o; }, range: async (a: number, b: number) => ({ data: rows.slice(a, b + 1), error: null }) }; return o; };
  return { supabase: { from: q } };
});
it("diag", async () => {
  const { fetchCoreMatiereStates } = await import("@/lib/coreExamPublication");
  const { fetchPassagesV2NonFiables, verifierPassageV2, verifierContenuPassage, contenuFicheTronqueCompatible } = await import("@/lib/passagesV2NonFiables");
  const { attacherSourceUnique, noteExamenAffichee } = await import("@/lib/noteExamenAffichee");
  const { mergePassageSiblingRows, excludeResultPlaceholders } = await import("@/components/cours-en-ligne/exam-helpers");
  for (const id of ["10c15d2c-221f-428d-8076-fe9b1f43f7ab", "e912ca30-7d7f-4fa9-87ba-e4755fcad023"]) {
    const states = await fetchCoreMatiereStates(id);
    const nf = await fetchPassagesV2NonFiables(new Map([[id, states!]]));
    const rows = mergePassageSiblingRows(excludeResultPlaceholders(tables.apprenant_quiz_results.filter((r) => r.apprenant_id === id))) as any[];
    for (const r of rows) {
      const a = attacherSourceUnique(r, states, nf);
      const core = states!.find((s) => s.matiereId === r.matiere_id);
      const orig = r.details;
      console.log(id.slice(0, 4), r.matiere_id, JSON.stringify(noteExamenAffichee(a)), "core?", !!a.__core, core && { v2: verifierPassageV2(core, orig?.reponses ?? r.reponses), contenu: verifierContenuPassage(core, orig), tronq: contenuFicheTronqueCompatible(core, orig), pending: core.pending, note: core.note20 });
    }
  }
});
