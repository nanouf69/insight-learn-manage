import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { supabase } from "@/integrations/supabase/client";
import { chargerConsultationEb2, projeterNoteHistoriqueEb2, projeterResultatEb2, type ResultatEb2 } from "@/features/correction-qrc-v2/eb2Consultation";

function copy(overrides: Partial<ResultatEb2> = {}): ResultatEb2 {
  return { id: "original", apprenant_id: "student", quiz_id: "EB2", matiere_id: "gestion", tentative: 1,
    completed_at: "2026-11-09T19:00:00Z", score_obtenu: 16.5, score_max: 20, note_sur_20: 16.5,
    details: { qrc_pending_correction: true, questions: [{ questionId: 1, type: "QRC", reponseEleve: "answer" }],
      snapshot: { questions: [{ id: 1, type: "QRC", points: 2 }] }, reponses: { 1: "answer" },
      correctionsIA: { 1: { pointsObtenus: 1, validatedByAdmin: true } } }, ...overrides };
}
function projection(r: ResultatEb2) {
  return projeterNoteHistoriqueEb2(r, projeterResultatEb2(r, "anonymous", true).qrc);
}
describe("EB2 original historical subject note, read only", () => {
  it("includes QCM points through the original subject score, not just 1 QRC point", () => {
    expect(projection(copy())).toMatchObject({ result_id: "original", attempt_id: "consultation:original", score: 16.5, status: "definitif", qrc_restantes: 0 });
  });
  it("normalizes a non-20 maximum once using the shared reader", () => {
    expect(projection(copy({ score_obtenu: 15, score_max: 25, note_sur_20: 12 }))?.score).toBe(12);
  });
  it("does not publish unvalidated QRC points as a definitive note", () => {
    const r = copy(); r.details.correctionsIA[1] = { pointsObtenus: 2 };
    expect(projection(r)).toMatchObject({ score: null, status: "provisoire", qrc_restantes: 1 });
  });
  it("preserves a recorded zero without inventing zero for a missing score", () => {
    expect(projection(copy({ score_obtenu: 0, note_sur_20: 0 }))?.score).toBe(0);
    expect(projection(copy({ score_obtenu: null, note_sur_20: null }))?.score).toBeNull();
  });
  it("does not project TAXI or an unfinished copy", () => {
    expect(projection(copy({ quiz_id: "EB2-TAXI" }))).toBeNull();
    expect(projection(copy({ completed_at: null }))).toBeNull();
  });
  it("rereads a revised original score without changing source evidence", () => {
    const r = copy(); const before = JSON.stringify(r);
    expect(projection(r)?.score).toBe(16.5);
    expect(projection(copy({ score_obtenu: 17.5, note_sur_20: 17.5 }))?.score).toBe(17.5);
    expect(JSON.stringify(r)).toBe(before);
  });
  it("the consultation loader exposes fresh notes on reopen using SELECT only", async () => {
    let stored = copy(); const selects: string[] = [];
    const from = vi.fn((table: string): any => ({
      select(s: string) { selects.push(s); return this; }, eq() { return this; }, in() { return this; }, order() { return this; },
      range() { return Promise.resolve({ data: [], error: null }); },
      then(resolve: any) { return Promise.resolve({ data: table === "apprenant_quiz_results" ? [stored] : [{ id: "student", nom: "Anonymous", prenom: "" }], error: null }).then(resolve); },
    }));
    Object.assign(supabase, { from });
    expect((await chargerConsultationEb2(["consultation:original", "native-id"])).resultats[0].score).toBe(16.5);
    stored = copy({ score_obtenu: 17.5, note_sur_20: 17.5 });
    expect((await chargerConsultationEb2(["consultation:original"])).resultats[0].score).toBe(17.5);
    expect(selects.some(s => s.includes("score_max, note_sur_20"))).toBe(true);
    expect((await chargerConsultationEb2(["native-id"])).resultats).toEqual([]);
  });
});