// DIAGNOSTIC TEMPORAIRE (lecture seule, données copiées localement) — à supprimer.
import { describe, it, vi } from "vitest";
import fs from "node:fs";
const rd = (f: string) => JSON.parse(fs.readFileSync(`/tmp/diag/${f}.json`, "utf8")) ?? [];
const T: Record<string, any[]> = {
  exam_attempts_v2: rd("attempts"), qrc_instances_v2: rd("qrcs"), core_exam_results: rd("results"),
  core_tentatives_neutralisees: [], apprenant_quiz_results: rd("legacy"), answer_state: rd("as"),
};
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (t: string) => {
  const q: any = {}; for (const m of ["select", "in", "eq", "order"]) q[m] = () => q;
  q.range = async (f: number) => ({ data: f === 0 ? T[t] ?? [] : [], error: null }); return q;
} } }));
import { fetchCoreMatiereStates } from "@/lib/coreExamPublication";
import { fetchPassagesV2NonFiables } from "@/lib/passagesV2NonFiables";
import { coreFiablePourLigne, attacherSourceUnique, noteExamenAffichee } from "@/lib/noteExamenAffichee";
import { verifierPassageV2, verifierContenuPassage, contenuFicheTronqueCompatible } from "@/lib/passagesV2NonFiables";
import { matchCoreState } from "@/lib/coreExamPublication";

describe("diag", () => { it("hasnat", async () => {
  const A = "86eebfff-3714-4acb-bb9f-e808f516fbbe";
  const st = (await fetchCoreMatiereStates(A))!;
  await fetchPassagesV2NonFiables(new Map([[A, st]]));
  for (const row of T.apprenant_quiz_results) {
    const core = matchCoreState(st, row.quiz_id, row.matiere_id, row.completed_at, row.id, row.tentative, row.apprenant_id);
    const d = row.details;
    const r = attacherSourceUnique({ ...row, quiz_type: "examen_blanc" }, st, new Set());
    console.log("DIAG", row.matiere_id, "core?", !!core, core && { pending: core.pending, note: core.note20, qrc: core.qrcTotal },
      core && verifierPassageV2(core, d?.reponses), core && verifierContenuPassage(core, d), core && contenuFicheTronqueCompatible(core, d), core && verifierContenuPassage(core, d, { enonceLibre: true }),
      JSON.stringify(noteExamenAffichee(r)), "lignePlate:", !!coreFiablePourLigne(st, { ...row, ...d, quizId: row.quiz_id, matiereId: row.matiere_id, completedAt: row.completed_at, resultId: row.id }));
  }
}); });
