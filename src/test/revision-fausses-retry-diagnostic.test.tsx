import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RevisionFausses } from "@/components/cours-en-ligne/ExamenBlancsResultats";
import { enqueueAnswerSave, flushAnswerSavesAndWait } from "@/lib/answerPersistence";
import { creerRevisionProgressState } from "@/lib/revisionFaussesProgression";

const h = vi.hoisted(() => ({
  rows: [] as any[], saved: null as any, insertError: null as any, inserts: [] as any[], failAfterCommit: false, tables: [] as string[],
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => {
    h.tables.push(table);
    const query: any = {
      filters: {},
      select: () => query,
      eq: (key: string, value: unknown) => { query.filters[key] = value; return query; },
      like: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle: async () => ({ data: h.saved, error: null }),
      insert: async (payload: any) => { h.inserts.push(payload); if(h.failAfterCommit) { h.failAfterCommit=false; return {error: {message:"Réponse réseau perdue après commit fictif"}}; } return { error: h.insertError }; },
      then: (ok: any) => ok({ data: h.rows, error: null }),
      delete: () => { throw new Error("Suppression interdite dans le test"); },
    };
    return query;
  } },
}));
vi.mock("@/lib/answerPersistence", async (original) => {
  const actual = await original<any>();
  return {
    ...actual,
    enqueueAnswerSave: vi.fn(),
    flushAnswerSavesAndWait: vi.fn(async () => {
      const calls = vi.mocked(enqueueAnswerSave).mock.calls;
      const last = calls.at(-1)?.[0] as any;
      if (last?.completed) h.saved = { reponses: last.reponses, score: last.score, completed: true };
      return true;
    }),
    flushAnswerSavesOnUnload: vi.fn(),
  };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const wrongQuestions: any[] = [
  {
    matiereNom: "T3P", matiere: { id: "t3p", questions: [] },
    question: { id: 1, type: "QCM", enonce: "Question T3P", choix: [
      { lettre: "A", texte: "Réponse A", correct: false },
      { lettre: "B", texte: "Réponse B", correct: true },
    ] },
  },
  {
    matiereNom: "Gestion", matiere: { id: "gestion", questions: [] },
    question: { id: 1, type: "QRC", enonce: "Question Gestion", reponseQRC: "Texte attendu", reponses_possibles: ["texte"] },
  },
];
wrongQuestions[0].matiere.questions = [wrongQuestions[0].question];
wrongQuestions[1].matiere.questions = [wrongQuestions[1].question];
const order = ["t3p:1", "gestion:1"];
const base = "revision_fausses_EB2-TAXI";

function monter(onTerminer = vi.fn()) {
  return { onTerminer, ...render(<RevisionFausses wrongQuestions={wrongQuestions} onTerminer={onTerminer} apprenantId="a1" userId="u1" examenId="EB2-TAXI" />) };
}
async function pret() { await waitFor(() => expect(screen.getByText("Question T3P") || screen.getByText("Question Gestion")).toBeTruthy()); }
const dernierPayload = () => vi.mocked(enqueueAnswerSave).mock.calls.at(-1)?.[0] as any;

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  h.rows = [{ exercice_id: base, completed: false }];
  h.saved = null; h.insertError = null; h.failAfterCommit=false; h.inserts = []; h.tables = [];
  vi.mocked(flushAnswerSavesAndWait).mockImplementation(async () => {
    const last = dernierPayload();
    if (last?.completed) h.saved = { reponses: last.reponses, score: last.score, completed: true };
    return true;
  });
});

describe("Révision questions fausses — comportement", () => {
  it("restaure la QRC, sa position et sa correction déjà validée", async () => {
    h.saved = { reponses: { revisionState: creerRevisionProgressState({
      examenId: "EB2-TAXI", answers: { "gestion:1": "brouillon QRC" }, currentIndex: 1,
      correctedCount: 1, correctedQuestions: order, showCorrection: true, questionOrder: order,
    }) }, score: 1 };
    monter();
    await screen.findByText("Question Gestion");
    expect(screen.getByDisplayValue("brouillon QRC")).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
    expect(screen.getByText(/Réponse attendue/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Terminer la révision/ })).toBeInTheDocument();
  });

  it("enregistre QCM et QRC sous des clés matière+question et refuse le double comptage", async () => {
    monter();
    await screen.findByText("Question T3P");
    fireEvent.click(screen.getByText("Réponse B"));
    expect(dernierPayload().reponses.revisionState.answers["t3p:1"]).toEqual(["B"]);
    const valider = screen.getByRole("button", { name: "Valider ma réponse" });
    fireEvent.click(valider); fireEvent.click(valider);
    expect(dernierPayload().reponses.revisionState.correctedCount).toBe(1);
    expect(dernierPayload().reponses.revisionState.correctedQuestions).toEqual(["t3p:1"]);
    expect(screen.getByText("Question T3P")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 450));
    fireEvent.click(screen.getByRole("button", { name: /Question suivante/ }));
    await screen.findByText("Question Gestion");
    fireEvent.change(screen.getByPlaceholderText("Saisissez votre réponse..."), { target: { value: "ma QRC" } });
    expect(dernierPayload().reponses.revisionState.answers).toEqual({ "t3p:1": ["B"], "gestion:1": "ma QRC" });
    expect(dernierPayload().events[0]).toMatchObject({ question_id: "gestion:1", valeur: "ma QRC" });
  });

  it("termine seulement après flush, relecture completed et un seul résultat malgré le double clic", async () => {
    h.saved = { reponses: { revisionState: creerRevisionProgressState({
      examenId: "EB2-TAXI", answers: { "gestion:1": "texte" }, currentIndex: 1,
      correctedCount: 1, correctedQuestions: order, showCorrection: true, questionOrder: order,
    }) }, score: 1 };
    const { onTerminer } = monter();
    const bouton = await screen.findByRole("button", { name: /Terminer la révision/ });
    fireEvent.click(bouton); fireEvent.click(bouton);
    await waitFor(() => expect(onTerminer).toHaveBeenCalledTimes(1));
    expect(flushAnswerSavesAndWait).toHaveBeenCalledWith("a1", base);
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0].details.reponses["gestion:1"]).toBe("texte");
    expect(h.inserts[0].details.questionOrder).toEqual(order);
    expect(dernierPayload().completed).toBe(true);
  });

  it("une clôture non confirmée ou un reset concurrent ne crée aucun résultat et conserve l'écran", async () => {
    vi.mocked(flushAnswerSavesAndWait).mockResolvedValue(false);
    h.saved = { reponses: { revisionState: creerRevisionProgressState({
      examenId: "EB2-TAXI", answers: {}, currentIndex: 1, correctedCount: 0,
      correctedQuestions: order, showCorrection: true, questionOrder: order,
    }) }, score: 0 };
    const { onTerminer } = monter();
    fireEvent.click(await screen.findByRole("button", { name: /Terminer la révision/ }));
    await waitFor(() => expect(flushAnswerSavesAndWait).toHaveBeenCalled());
    expect(h.inserts).toHaveLength(0);
    expect(onTerminer).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Terminer la révision/ })).toBeEnabled();
  });

  it("une relecture encore non terminée après un reset concurrent bloque le résultat", async () => {
    vi.mocked(flushAnswerSavesAndWait).mockResolvedValue(true);
    h.saved = { reponses: { revisionState: creerRevisionProgressState({
      examenId: "EB2-TAXI", answers: {}, currentIndex: 1, correctedCount: 0,
      correctedQuestions: order, showCorrection: true, questionOrder: order,
    }) }, score: 0, completed: false };
    const { onTerminer } = monter();
    fireEvent.click(await screen.findByRole("button", { name: /Terminer la révision/ }));
    await waitFor(() => expect(flushAnswerSavesAndWait).toHaveBeenCalled());
    expect(h.inserts).toHaveLength(0);
    expect(onTerminer).not.toHaveBeenCalled();
  });

  it("Recommencer alloue une nouvelle tentative et ne supprime jamais le brouillon", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    monter();
    await screen.findByText("Question T3P");
    fireEvent.click(screen.getByRole("button", { name: /Recommencer/ }));
    expect(dernierPayload().exercice_id).toBe(`${base}__r2`);
    expect(dernierPayload().reponses.revisionState.answers).toEqual({});
    expect(h.tables).not.toContain("delete");
  });
  it("diagnostic : commit du résultat puis réponse perdue et nouvel essai", async () => {
    h.saved = { reponses: { revisionState: creerRevisionProgressState({
      examenId: "EB2-TAXI", answers: { "gestion:1": "texte" }, currentIndex: 1,
      correctedCount: 1, correctedQuestions: order, showCorrection: true, questionOrder: order,
    }) }, score: 1 };
    h.failAfterCommit=true;
    const {onTerminer}=monter();
    fireEvent.click(await screen.findByRole("button", {name:/Terminer la révision/}));
    await waitFor(()=>expect(h.inserts).toHaveLength(1));
    await waitFor(()=>expect(screen.getByRole("button",{name:/Terminer la révision/})).toBeEnabled());
    expect(onTerminer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name:/Terminer la révision/}));
    await waitFor(()=>expect(onTerminer).toHaveBeenCalledTimes(1));
    expect(h.inserts).toHaveLength(2);
    console.log("REPRODUIT : deux insertions du même revision_exercice_id après commit puis perte de retour (serveur simulé)");
  });

});
