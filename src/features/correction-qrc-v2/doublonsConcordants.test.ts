import { it, expect } from "vitest";
import { resoudreDoublonsConcordants } from "./doublonsConcordants";
const row: any = { id: "r", quiz_id: "EB3-TAXI", matiere_id: "anglais", completed_at: "2026-11-10T13:54:15Z", __core: { lectureImpossible: true } };
const s = (id: string, at: string, note20: number, extra = {}) => ({ attemptId: id, examId: "EB3-TAXI", matiereId: "anglais", finishedAt: at, note20, pending: false, status: "definitif", qrcTotal: 0, qrcRestantes: 0, resultId: null, ...extra }) as any;
it("deux copies 13/20 définitives : note 13 affichée", () => {
  const r = resoudreDoublonsConcordants(row, [s("a", "2026-11-10T13:53:17Z", 13), s("b", "2026-11-10T13:54:14Z", 13)], new Set());
  expect(r.__core.note20).toBe(13); expect(r.__core.attemptId).toBe("b"); expect(r.__doublonConcordant).toBe(2);
});
it("notes différentes : reste illisible", () => {
  expect(resoudreDoublonsConcordants(row, [s("a", "2026-11-10T13:53:17Z", 12), s("b", "2026-11-10T13:54:14Z", 13)], new Set()).__core.lectureImpossible).toBe(true);
});
it("une copie provisoire ou non fiable : reste illisible", () => {
  expect(resoudreDoublonsConcordants(row, [s("a", "2026-11-10T13:53:17Z", 13, { pending: true }), s("b", "2026-11-10T13:54:14Z", 13)], new Set()).__core.lectureImpossible).toBe(true);
  expect(resoudreDoublonsConcordants(row, [s("a", "2026-11-10T13:53:17Z", 13), s("b", "2026-11-10T13:54:14Z", 13)], new Set(["a"])).__core.lectureImpossible).toBe(true);
});
it("une seule copie : jamais devinée", () => {
  expect(resoudreDoublonsConcordants(row, [s("b", "2026-11-10T13:54:14Z", 13)], new Set()).__core.lectureImpossible).toBe(true);
});
