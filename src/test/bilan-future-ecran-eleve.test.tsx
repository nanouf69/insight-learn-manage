// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const calls: { name: string; args: any }[] = [];
const server = { drafts: {} as Record<string, string[]>, submitted: null as null | { correct_count: number; question_count: number } };
const QUESTIONS = [
  { id: 62, enonce: "Ce panneau annonce un passage à niveau :", image: "/images/q62.png", choix: [{ lettre: "A", texte: "Avec barrières" }, { lettre: "B", texte: "Sans barrières" }] },
  { id: 64, enonce: "Question 2", choix: [{ lettre: "A", texte: "Oui" }, { lettre: "B", texte: "Non" }] },
];
const RECEIPT = { id: "rcpt-1", version_id: "ver-1", module_id: 5, exercise_id: 502 };

function rpc(name: string, args: any) {
  calls.push({ name, args });
  if (name === "bilan_future_route") return Promise.resolve({ data: "future", error: null });
  if (name === "bilan_future_open") return Promise.resolve({ data: RECEIPT, error: null });
  if (name === "bilan_future_questions") return Promise.resolve({ data: { version_id: "ver-1", questions: QUESTIONS }, error: null });
  if (name === "bilan_future_resume") return Promise.resolve({ data: { version_id: "ver-1", answers: Object.fromEntries(Object.entries(server.drafts).map(([k, v]) => [k, { answer: v, revision: 1 }])), submitted: !!server.submitted }, error: null });
  if (name === "bilan_future_save_draft") { server.drafts[String(args.p_question)] = args.p_answer; return Promise.resolve({ data: null, error: null }); }
  if (name === "bilan_future_submit") { server.submitted = { correct_count: 1, question_count: 2 }; return Promise.resolve({ data: server.submitted, error: null }); }
  return Promise.resolve({ data: null, error: { code: "42883" } });
}
function from(table: string) {
  const q: any = {
    select: () => q, eq: () => q,
    maybeSingle: () => Promise.resolve({ data: table === "bilan_future_submissions" ? server.submitted : null, error: null }),
    then: (res: any) => res({ data: [], error: null }),
  };
  return q;
}
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (n: string, a: any) => rpc(n, a), from: (t: string) => from(t) } }));

import { BilanFutureExam, lireRouteBilanFuture } from "@/components/cours-en-ligne/BilanFutureExam";

beforeEach(() => { calls.length = 0; server.drafts = {}; server.submitted = null; localStorage.clear(); });

describe("Nouveau Bilan examen — écran élève", () => {
  it("la route serveur décide ; une erreur de lecture garde l'ancien écran", async () => {
    expect(await lireRouteBilanFuture(5)).toBe("future");
    expect(await lireRouteBilanFuture(28)).toBe("legacy");
  });

  it("ouvre une matière, affiche énoncé/choix/image sans aucune bonne réponse", async () => {
    render(<BilanFutureExam moduleId={5} ownerId="u1" />);
    fireEvent.click(screen.getByText("Sécurité routière"));
    await screen.findByText(/Ce panneau annonce/);
    expect(calls.find(c => c.name === "bilan_future_open")?.args).toEqual({ p_module: 5, p_exercise: 502 });
    expect(screen.getByText("Sans barrières")).toBeTruthy();
    expect(document.body.innerHTML).not.toMatch(/correct/i);
  });

  it("sauvegarde chaque réponse par reçu+version, reprend après rechargement, puis remet", async () => {
    const { unmount } = render(<BilanFutureExam moduleId={5} ownerId="u1" />);
    fireEvent.click(screen.getByText("Sécurité routière"));
    await screen.findByText(/Ce panneau annonce/);
    fireEvent.click(screen.getByLabelText("Q1 choix B"));
    await waitFor(() => expect(server.drafts["62"]).toEqual(["B"]));
    const save = calls.find(c => c.name === "bilan_future_save_draft")!.args;
    expect(save).toMatchObject({ p_receipt: "rcpt-1", p_version: "ver-1", p_question: 62, p_revision: 1 });
    unmount();

    // Reprise : la réponse revient du serveur.
    render(<BilanFutureExam moduleId={5} ownerId="u1" />);
    fireEvent.click(screen.getByText("Sécurité routière"));
    await screen.findByText(/Ce panneau annonce/);
    expect(screen.getByLabelText("Q1 choix B").getAttribute("data-state")).toBe("checked");

    // Remise refusée tant qu'une question est vide.
    fireEvent.click(screen.getByText("Remettre la matière"));
    expect((await screen.findByRole("alert")).textContent).toMatch(/1 question/);
    expect(calls.some(c => c.name === "bilan_future_submit")).toBe(false);

    fireEvent.click(screen.getByLabelText("Q2 choix A"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByText("Remettre la matière"));
    expect((await screen.findByTestId("bilan-future-resultat")).textContent).toContain("1/2");
    expect(calls.find(c => c.name === "bilan_future_submit")!.args).toEqual({ p_receipt: "rcpt-1", p_answers: { "62": ["B"], "64": ["A"] } });
  });

  it("n'écrit jamais dans les anciennes tables du Bilan", async () => {
    render(<BilanFutureExam moduleId={11} ownerId="u1" />);
    fireEvent.click(screen.getByText("Gestion"));
    await screen.findByText(/Ce panneau annonce/);
    expect(calls.every(c => c.name.startsWith("bilan_future_"))).toBe(true);
    expect(calls.find(c => c.name === "bilan_future_open")?.args).toEqual({ p_module: 11, p_exercise: 601 });
  });
});
