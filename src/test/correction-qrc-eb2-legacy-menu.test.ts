import { beforeEach, describe, expect, it, vi } from "vitest";
import { eb2HistoriqueNonCopie, memePassageEb2 } from "@/features/correction-qrc-v2/eb2Historique";

const db = vi.hoisted(() => ({ rows: {} as Record<string, any[]>, calls: [] as any[], error: false }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const filters: any[] = []; const orders: string[] = [];
  const query: any = {
    select: () => query, eq: (k: string, v: unknown) => { filters.push([k, v]); return query; },
    in: () => query, or: () => query, order: (k: string) => { orders.push(k); return query; },
    range: (from: number, to: number) => { db.calls.push({ table, from, to, filters, orders }); return Promise.resolve(read().slice(from, to + 1)).then(data => ({ data, error: db.error && table === "apprenant_quiz_results" ? new Error("read refused") : null })); },
    then: (resolve: any) => Promise.resolve({ data: read(), error: null }).then(resolve),
  };
  const read = () => (db.rows[table] ?? []).filter(r => filters.every(([k,v]) => r[k] === v));
  return query;
} } }));
import { listerGroupesCrm } from "@/features/correction-qrc-v2/noyauReel";

beforeEach(() => {
  db.error = false; db.calls = [];
  db.rows = {
    exam_attempts_v2: [{ attempt_id: "v2", apprenant_id: "a", exam_id: "EB2", is_test: false, started_at: "2026-11-09T10:00:00Z", snapshot: { source_historique: { result_id: "copied" } } }],
    apprenant_quiz_results: [], core_tentatives_neutralisees: [],
    apprenants: [{ id: "a", type_apprenant: "vtc" }],
    session_apprenants: [{ apprenant_id: "a", session_id: "jour" }],
    sessions: [{ id: "jour", nom: "Novembre journée", date_debut: "2026-11-02", date_fin: "2026-11-13" }],
  };
});
const result = (id: string, quiz_id = "EB2") => ({ id, apprenant_id: "a", quiz_id, completed_at: "2026-11-09T10:00:00Z" });
describe("EB2 historical menu boundary", () => {
  it("includes only exact EB2 and refuses a positively linked V2 result", () => {
    expect(eb2HistoriqueNonCopie(result("r"), new Set())).toBe(true);
    expect(eb2HistoriqueNonCopie(result("r"), new Set(["r"]))).toBe(false);
    for (const id of ["EB2-TAXI", "eb2-ta", "EB20", "EB1", "EB6"]) expect(eb2HistoriqueNonCopie(result("r", id), new Set())).toBe(false);
  });
  it("keeps T1/T2 distinct even with identical answers and retains same-tentative identity", () => {
    expect(memePassageEb2({ id: "r1", tentative: 1 }, { id: "r2", tentative: 2 })).toBe(false);
    expect(memePassageEb2({ id: "r1", tentative: 1 }, { id: "r2", tentative: 1 })).toBe(true);
    expect(memePassageEb2({ id: "r1" }, { id: "r2" })).toBe(false);
  });
  it("paginates 1001 rows and keeps EB2 V2 separate, preserving EB3", async () => {
    db.rows.apprenant_quiz_results = [...Array.from({ length: 1001 }, (_, i) => result(`r${i}`)), result("copied"), result("eb3", "EB3"), result("taxi", "EB2-TAXI")];
    const groups = await listerGroupesCrm();
    const exams = groups[0].examens;
    expect(exams.find(e => e.exam_id === "EB2" && e.circuit === "ancien")?.legacyResultIds).toHaveLength(1001);
    expect(exams.find(e => e.exam_id === "EB2" && e.circuit === "v2")?.attemptIds).toEqual(["v2"]);
    expect(exams.find(e => e.exam_id === "EB3")?.legacyResultIds).toEqual(["eb3"]);
    expect(exams.some(e => e.exam_id === "EB2-TAXI")).toBe(false);
    expect(db.calls.filter(c => c.table === "apprenant_quiz_results").map(c => c.from)).toEqual([0,1000]);
    expect(db.calls.find(c => c.table === "apprenant_quiz_results").orders).toEqual(["completed_at","id"]);
  });
  it("does not expose historical results in test mode", async () => {
    db.rows.apprenant_quiz_results = [result("r")];
    expect(await listerGroupesCrm("test")).toEqual([]);
    expect(db.calls.some(c => c.table === "apprenant_quiz_results")).toBe(false);
  });
  it("refuses a read error instead of displaying an incomplete catalogue", async () => {
    db.error = true;
    await expect(listerGroupesCrm()).rejects.toThrow("read refused");
  });
});