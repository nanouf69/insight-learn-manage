import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RevisionFausses } from "@/components/cours-en-ligne/ExamenBlancsResultats";
import { enqueueAnswerSave, flushAnswerSavesAndWait } from "@/lib/answerPersistence";
import { creerRevisionProgressState } from "@/lib/revisionFaussesProgression";
import { REVISION_FINALISATION_SERVEUR_ACTIVE } from "@/lib/revisionFinalisationServeur";

// Published bundle: the server RPC is not installed, so it must never be called.
const h = vi.hoisted(() => ({
  saved: null as any, inserts: [] as any[], rpcs: [] as string[], lectures: [] as Record<string, unknown>[],
  result: null as any, closed: false, loseResponse: false, failBeforeCommit: false, readError: false,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (name: string) => { h.rpcs.push(name); return { data: null, error: { message: "absent" } }; },
    from: (table: string) => {
      const query: any = {
        filters: {} as Record<string, unknown>,
        select: () => query,
        eq: (k: string, v: unknown) => { query.filters[k] = v; return query; },
        like: () => query, order: () => query, limit: () => query,
        maybeSingle: async () => { h.lectures.push({ table, ...query.filters }); return { data: table === "apprenant_quiz_results" ? h.result : h.saved, error: h.readError ? { message: "offline" } : null }; },
        insert: async (payload: any) => {
          h.inserts.push({ table, payload });
          if (h.failBeforeCommit) { h.failBeforeCommit = false; return { error: { message: "offline" } }; }
          h.result = { id: "result-1", ...payload };
          return { error: h.loseResponse ? { message: "lost acknowledgement" } : null };
        },
        then: (ok: any) => ok({ data: table === "apprenant_quiz_results" ? (h.result ? [h.result] : []) : [{ exercice_id: "revision_fausses_EB2-TAXI", completed: h.closed }], error: null }),
      };
      return query;
    },
  },
}));
vi.mock("@/lib/answerPersistence", async (original) => {
  const actual = await original<any>();
  return { ...actual, enqueueAnswerSave: vi.fn(), flushAnswerSavesAndWait: vi.fn(), flushAnswerSavesOnUnload: vi.fn() };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const question = { id: 1, type: "QRC", enonce: "Question Gestion", reponseQRC: "Texte", reponses_possibles: ["texte"] };
const wrongQuestions: any[] = [{ matiereNom: "Gestion", matiere: { id: "gestion", questions: [question] }, question, sourceResultId: "original-immutable-copy" }];
const order = ["gestion:1"];

beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  h.inserts = []; h.rpcs = []; h.lectures = [];
  h.result = null; h.closed = false; h.loseResponse = false; h.failBeforeCommit = false; h.readError = false;
  h.saved = { reponses: { revisionState: creerRevisionProgressState({
    examenId: "EB2-TAXI", answers: { "gestion:1": "texte" }, currentIndex: 0,
    correctedCount: 1, correctedQuestions: order, showCorrection: true, questionOrder: order,
    sourceResultIds: {'gestion:1': 'original-immutable-copy'},
  }) }, score: 1 };
  vi.mocked(flushAnswerSavesAndWait).mockImplementation(async () => {
    const last = vi.mocked(enqueueAnswerSave).mock.calls.at(-1)?.[0] as any;
    if (last?.completed) h.saved = { ...h.saved, reponses: last.reponses, score: last.score, completed: true };
    return true;
  });
});

describe("Révision fausses — chemin publié tant que le serveur n'est pas installé", () => {
  it("le commutateur serveur reste désactivé", () => {
    expect(REVISION_FINALISATION_SERVEUR_ACTIVE).toBe(false);
  });

  it("Terminer n'appelle jamais finaliser_revision_fausses et insère un seul résultat", async () => {
    const onTerminer = vi.fn();
    render(<RevisionFausses wrongQuestions={wrongQuestions} onTerminer={onTerminer} apprenantId="a1" userId="u1" examenId="EB2-TAXI" />);
    fireEvent.click(await screen.findByRole("button", { name: /Terminer la révision/ }));
    await waitFor(() => expect(onTerminer).toHaveBeenCalledTimes(1));
    expect(h.rpcs).toEqual([]);
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0].table).toBe("apprenant_quiz_results");
    expect(h.inserts[0].payload).toMatchObject({ quiz_type: "revision_fausses", quiz_id: "EB2-TAXI", score_obtenu: 1, score_max: 1 });
    expect(h.inserts[0].payload.details.revision_exercice_id).toBe("revision_fausses_EB2-TAXI");
    expect(h.saved.reponses.revisionState.sourceResultIds).toEqual({ "gestion:1": "original-immutable-copy" });
    expect(h.inserts[0].payload.details.sourceResultIds).toEqual({ "gestion:1": "original-immutable-copy" });
  });

  it("la reprise relit aussi une clôture dont l'insertion a été interrompue", async () => {
    h.closed = true; h.saved.completed = true;
    render(<RevisionFausses wrongQuestions={wrongQuestions} onTerminer={vi.fn()} apprenantId="a1" userId="u1" examenId="EB2-TAXI" />);
    await screen.findByText("Question Gestion");
    expect(h.lectures[0]).toMatchObject({ table: "reponses_apprenants", exercice_id: "revision_fausses_EB2-TAXI" });
    expect(h.lectures[0].completed).toBeUndefined();
  });
  it("un accusé perdu est confirmé par relecture sans seconde insertion", async () => {
    h.loseResponse = true;
    const done = vi.fn();
    render(<RevisionFausses wrongQuestions={wrongQuestions} onTerminer={done} apprenantId="a1" userId="u1" examenId="EB2-TAXI" />);
    fireEvent.click(await screen.findByRole("button", { name: /Terminer la révision/ }));
    await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
    expect(h.inserts).toHaveLength(1);
  });
  it("échec avant insertion : réessaie la même clôture sans réécrire ses réponses", async () => {
    h.closed = true; h.saved.completed = true; h.failBeforeCommit = true;
    const done = vi.fn();
    render(<RevisionFausses wrongQuestions={wrongQuestions} onTerminer={done} apprenantId="a1" userId="u1" examenId="EB2-TAXI" />);
    fireEvent.click(await screen.findByRole("button", { name: /Terminer la révision/ }));
    await waitFor(() => expect(h.inserts).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole("button", { name: /Terminer la révision/ })).toBeEnabled());
    expect(done).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Terminer la révision/ }));
    await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
    expect(enqueueAnswerSave).not.toHaveBeenCalled();
    expect(h.inserts.map(x => x.payload.details.revision_exercice_id)).toEqual(["revision_fausses_EB2-TAXI", "revision_fausses_EB2-TAXI"]);
  });
  it("aucun résultat inséré ni succès si la clôture serveur manque une réponse", async () => {
    h.saved.reponses.revisionState.answers = {};
    const done = vi.fn();
    render(<RevisionFausses wrongQuestions={wrongQuestions} onTerminer={done} apprenantId="a1" userId="u1" examenId="EB2-TAXI" />);
    expect(await screen.findByRole("button", { name: "Valider ma réponse" })).toBeDisabled();
    expect(flushAnswerSavesAndWait).not.toHaveBeenCalled();
    expect(h.inserts).toHaveLength(0); expect(done).not.toHaveBeenCalled();
  });
});
