// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { reponseExacte, questionsFausses, lireCorrection } from "@/lib/bilanFutureCorrection";

const calls: { name: string; args: any }[] = [];
const QUESTIONS = [
  { id: 1, enonce: "Question simple", choix: [{ lettre: "A", texte: "Oui" }, { lettre: "B", texte: "Non" }] },
  { id: 2, enonce: "Question multiple", imageSize: "lg", image: "/x.png", choix: [{ lettre: "A", texte: "a" }, { lettre: "B", texte: "b" }, { lettre: "C", texte: "c" }] },
  { id: 3, enonce: "Question juste", choix: [{ lettre: "A", texte: "x" }, { lettre: "B", texte: "y" }] },
];
const SUBMITTED = { "1": ["B"], "2": ["A"], "3": ["A"] };
const KEYS: Record<string, string[]> = { "1": ["A"], "2": ["A", "B"], "3": ["A"] };
function rpc(name: string, args: any) {
  calls.push({ name, args });
  if (name === "bilan_future_open") return Promise.resolve({ data: { id: "r1", version_id: "v1" }, error: null });
  if (name === "bilan_future_questions") return Promise.resolve({ data: { version_id: "v1", questions: QUESTIONS }, error: null });
  if (name === "bilan_future_resume") return Promise.resolve({ data: { version_id: "v1", answers: {}, submitted: true }, error: null });
  if (name === "bilan_future_correction") return Promise.resolve({ data: { receipt_id: "r1", version_id: "v1", correct_count: 1, question_count: 3,
    questions: QUESTIONS.map(q => ({ id: q.id, answer: (SUBMITTED as any)[q.id], correct: KEYS[q.id] })) }, error: null });
  return Promise.resolve({ data: null, error: { code: "42883" } });
}
function from() { const q: any = { select: () => q, eq: () => q, maybeSingle: () => Promise.resolve({ data: { correct_count: 1, question_count: 3 }, error: null }), then: (r: any) => r({ data: [], error: null }) }; return q; }
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (n: string, a: any) => rpc(n, a), from: () => from() } }));
import { BilanFutureExam } from "@/components/cours-en-ligne/BilanFutureExam";
beforeEach(() => { calls.length = 0; localStorage.clear(); });

describe("Correction Bilan examen (règles)", () => {
  it("QCM exact seulement : toutes les bonnes, aucune mauvaise", () => {
    expect(reponseExacte(["A", "B"], ["B", "A"])).toBe(true);
    expect(reponseExacte(["A"], ["A", "B"])).toBe(false);
    expect(reponseExacte(["A", "B", "C"], ["A", "B"])).toBe(false);
    expect(reponseExacte([], [])).toBe(false);
  });
  it("questions fausses = celles de CE passage remis, sans clé inconnue", () => {
    const c = lireCorrection({ receipt_id: "r", version_id: "v", correct_count: 1, question_count: 3, questions: [
      { id: 1, answer: ["B"], correct: ["A"] }, { id: 2, answer: ["A"], correct: [] }, { id: 3, answer: ["A"], correct: ["A"] }] }, "r", "v")!;
    expect(questionsFausses(c)).toEqual([1]);
    expect(lireCorrection({ receipt_id: "autre", version_id: "v", questions: [] }, "r", "v")).toBeNull();
  });
});

describe("Correction Bilan examen (écran)", () => {
  it("après remise : même écran que les modules, réponse élève + bonnes réponses, bouton 2 fausses, révision locale sans écriture", async () => {
    const choix = (qid: number, l: string) => document.querySelector(`[data-question-id="${qid}"] [data-choix="${l}"]`) as HTMLElement;
    render(<BilanFutureExam moduleId={5} ownerId="u1" />);
    await screen.findAllByText("📝 Quiz — Gestion");
    fireEvent.click(screen.getAllByText("📝 Quiz — Gestion")[0]);
    const btn = await screen.findByTestId("refaire-fausses");
    expect(btn.textContent).toContain("Refaire les fausses (2)");
    // Classic result block: score circle + Réponses grid + Progrès/Actions.
    expect(screen.getByText("Points : 1 / 3")).toBeTruthy();
    expect(screen.getByText("Réponses")).toBeTruthy();
    expect(screen.getByText("Progrès")).toBeTruthy();
    expect(document.querySelectorAll('[data-question-faute="1"]').length).toBe(2);
    // Q1: learner chose B (wrong, red), correct A highlighted green.
    expect(choix(1, "B").getAttribute("data-selected")).toBe("1");
    expect(choix(1, "B").className).toContain("border-destructive");
    expect(choix(1, "A").getAttribute("data-bonne")).toBe("1");
    // Q2 multiple: A selected, A+B correct.
    expect(choix(2, "B").getAttribute("data-bonne")).toBe("1");
    expect(choix(2, "B").getAttribute("data-selected")).toBeNull();
    fireEvent.click(btn);
    // Mandatory "Relisez vos erreurs" dialog, same as other modules.
    await screen.findByText("📖 Relisez vos erreurs avant de recommencer");
    expect(screen.getAllByText(/Votre réponse :/).length).toBe(2);
    fireEvent.click(screen.getByText("✅ J'ai relu mes erreurs — Refaire les fausses"));
    await screen.findByTestId("bilan-future-revision");
    expect(document.querySelectorAll("[data-learner-question]").length).toBe(2);
    expect(choix(1, "B").getAttribute("data-selected")).toBeNull();
    fireEvent.click(choix(1, "A"));
    fireEvent.click(choix(2, "A"));
    fireEvent.click(screen.getByText("Valider les QCM"));
    expect((await screen.findByTestId("revision-score")).textContent).toContain("1/2");
    const writes = calls.filter(c => /save_draft|submit/.test(c.name));
    expect(writes).toEqual([]);
    fireEvent.click(screen.getByText("Voir toutes les questions"));
    await waitFor(() => expect(choix(1, "B").getAttribute("data-selected")).toBe("1"));
    expect(document.querySelectorAll("[data-learner-question]").length).toBe(3);
  });
});

import { baremeReference, noterMatiere, moyenneBilan } from "@/lib/bilanFutureBareme";
import { EXAMENS_BLANCS_VTC, EXAMENS_BLANCS_TAXI } from "@/components/cours-en-ligne/examens-blancs-data";
describe("Barème Bilan = barème EB1 de la filière", () => {
  it("VTC = EB1, TAXI = EB1-TAXI : coefficients 3/2/3/2/1, éliminatoires 6/6/6/6/4, points QCM", () => {
    for (const [mod, ex] of [[5, EXAMENS_BLANCS_VTC], [11, EXAMENS_BLANCS_TAXI]] as const) {
      const b = baremeReference(ex as any, mod)!;
      expect(b.map(x => x.coefficient)).toEqual([3, 2, 3, 2, 1]);
      expect(b.map(x => x.seuil)).toEqual([6, 6, 6, 6, 4]);
      expect(b.map(x => x.ptsQcm)).toEqual([1, 1, 1, 2, 1]);
    }
  });
  it("note /20, éliminatoire et moyenne comme l'EB", () => {
    const b = baremeReference(EXAMENS_BLANCS_TAXI as any, 11)!;
    const fr = noterMatiere(b[3], 10, 97);
    expect(fr.maxPoints).toBe(194); expect(fr.noteSur20).toBe(2.1); expect(fr.admis).toBe(false);
    const an = noterMatiere(b[4], 39, 194); expect(an.noteSur20).toBe(4); expect(an.admis).toBe(true);
    const notes = [noterMatiere(b[0], 114, 114), noterMatiere(b[1], 200, 200), noterMatiere(b[2], 249, 249), fr, an];
    const m = moyenneBilan(b, notes);
    expect(m.verdict).toBe("echoue"); expect(m.eliminatoires.length).toBe(1);
    expect(moyenneBilan(b, [notes[0], null, null, null, null]).verdict).toBe("incomplet");
    expect(baremeReference([], 5)).toBeNull();
  });
});
