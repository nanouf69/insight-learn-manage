// @vitest-environment node
// Opt-in: SELECT-only data supplied outside the project, never a login or write.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";

const file = process.env.EXAM_SELECT_FIXTURE;
const tables = file ? JSON.parse(readFileSync(file, "utf8")) : {};
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  let rows = tables[table] ?? [];
  const q: any = {
    select: () => q,
    in: (key: string, values: unknown[]) => { rows = rows.filter((r: any) => values.includes(r[key])); return q; },
    eq: (key: string, value: unknown) => { rows = rows.filter((r: any) => r[key] === value); return q; },
    range: async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }),
  };
  return q;
} } }));
import { fetchCoreMatiereStates, matchCoreState } from "@/lib/coreExamPublication";
import { fetchPassagesV2NonFiables, verifierContenuPassage, verifierPassageV2 } from "@/lib/passagesV2NonFiables";
import { attacherSourceUnique, coreFiablePourLigne, noteExamenAffichee } from "@/lib/noteExamenAffichee";
import { isExamAttemptPublicationPending } from "@/components/cours-en-ligne/exam-helpers";
import { compterQuizModule } from "@/lib/moduleQuizCounter";

it.skipIf(!file)("SELECT réel → chargeurs applicatifs → sources et attentes (aucune écriture)", async () => {
  const fingerprint = () => createHash("sha256").update(JSON.stringify(tables)).digest("hex");
  const before = fingerprint();
  const id = tables.apprenant_module_completion[0].apprenant_id;
  const states = await fetchCoreMatiereStates(id);
  expect(states).not.toBeNull();
  const proofs = await fetchPassagesV2NonFiables(new Map([[id, states ?? []]]));
  expect(proofs).not.toBeNull();
  const results = tables.apprenant_quiz_results.filter((r: any) => /^EB[1-6]$/.test(r.quiz_id))
    .sort((a: any, b: any) => `${a.quiz_id}/${a.completed_at}/${a.matiere_id}`.localeCompare(`${b.quiz_id}/${b.completed_at}/${b.matiere_id}`))
    .map((r: any) => {
      const core = matchCoreState(states, r.quiz_id, r.matiere_id, r.completed_at, r.id, r.tentative, r.apprenant_id);
      const attached = attacherSourceUnique(r, states, proofs);
      const guarded = coreFiablePourLigne(states, r);
      expect(guarded?.pending ?? null).toEqual(attached.__core?.pending ?? null);
      return { exam: r.quiz_id, subject: r.matiere_id, attempt: r.tentative, date: r.completed_at,
        ...noteExamenAffichee(attached), pending: isExamAttemptPublicationPending(attached.__core, r.details),
        contentProof: core ? verifierContenuPassage(core, r.details) : null,
        answerProof: core ? verifierPassageV2(core, r.details?.reponses) : null };
    });
  const modules = tables.apprenant_module_completion.filter((r: any) => Number(r.module_id) === 2);
  const counter = compterQuizModule(modules, []);
  expect(counter.completedQuizzes).toBe(15);
  expect(counter.totalQuizzes).toBe(15);
  expect(fingerprint()).toBe(before);
  const report = { counts: { modules: tables.apprenant_module_completion.length, notes: tables.apprenant_quiz_results.length, qrc: tables.qrc_instances_v2.length }, unchangedInMemory: true,
    counter: { done: counter.completedQuizzes, total: counter.totalQuizzes, score: modules[0].score_obtenu, max: modules[0].score_max }, results };
  if (process.env.EXAM_SELECT_REPORT) writeFileSync(process.env.EXAM_SELECT_REPORT, JSON.stringify(report, null, 2));
});