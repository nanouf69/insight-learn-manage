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
  it("après remise : réponse élève + bonnes réponses visibles, bouton 2 fausses, révision locale sans écriture", async () => {
    render(<BilanFutureExam moduleId={5} ownerId="u1" />);
    fireEvent.click(screen.getByText("Gestion"));
    const btn = await screen.findByTestId("refaire-fausses");
    expect(btn.textContent).toContain("(2 questions)");
    expect(document.querySelectorAll('[data-question-faute="1"]').length).toBe(2);
    expect(screen.getAllByTestId("corrige-question")[0].textContent).toContain("Bonne(s) réponse(s) : A");
    expect(screen.getAllByTestId("corrige-question")[0].textContent).toContain("votre réponse : B");
    expect(screen.getByLabelText("Q1 choix B").getAttribute("data-state")).toBe("checked");
    fireEvent.click(btn);
    await screen.findByTestId("bilan-future-revision");
    expect(document.querySelectorAll("[data-learner-question]").length).toBe(2);
    expect(screen.getByLabelText("Q1 choix B").getAttribute("data-state")).toBe("unchecked");
    fireEvent.click(screen.getByLabelText("Q1 choix A"));
    fireEvent.click(screen.getByLabelText("Q2 choix A"));
    fireEvent.click(screen.getByText("Corriger ma révision"));
    expect((await screen.findByTestId("revision-score")).textContent).toContain("1/2");
    const writes = calls.filter(c => /save_draft|submit/.test(c.name));
    expect(writes).toEqual([]);
    fireEvent.click(screen.getByText("← Retour à la correction"));
    await waitFor(() => expect(screen.getByLabelText("Q1 choix B").getAttribute("data-state")).toBe("checked"));
  });
});
