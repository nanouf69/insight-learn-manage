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
        maybeSingle: async () => { h.lectures.push({ table, ...query.filters }); return { data: h.saved, error: null }; },
        insert: async (payload: any) => { h.inserts.push({ table, payload }); return { error: null }; },
        then: (ok: any) => ok({ data: [{ exercice_id: "revision_fausses_EB2-TAXI", completed: false }], error: null }),
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
const wrongQuestions: any[] = [{ matiereNom: "Gestion", matiere: { id: "gestion", questions: [question] }, question }];
const order = ["gestion:1"];

beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  h.inserts = []; h.rpcs = []; h.lectures = [];
  h.saved = { reponses: { revisionState: creerRevisionProgressState({
    examenId: "EB2-TAXI", answers: { "gestion:1": "texte" }, currentIndex: 0,
    correctedCount: 1, correctedQuestions: order, showCorrection: true, questionOrder: order,
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
  });

  it("la reprise ne relit qu'un brouillon ouvert", async () => {
    render(<RevisionFausses wrongQuestions={wrongQuestions} onTerminer={vi.fn()} apprenantId="a1" userId="u1" examenId="EB2-TAXI" />);
    await screen.findByText("Question Gestion");
    expect(h.lectures[0]).toMatchObject({ table: "reponses_apprenants", completed: false });
  });
});
