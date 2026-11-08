import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RevisionFausses } from "@/components/cours-en-ligne/ExamenBlancsResultats";
import { setAnswerSaveAuthToken, setAnswerSaveOwnership } from "@/lib/answerPersistence";
import { creerRevisionProgressState } from "@/lib/revisionFaussesProgression";

const APPRENANT = "11111111-1111-1111-1111-111111111111";
const USER = "22222222-2222-2222-2222-222222222222";
const EXAMEN = "EB2-TAXI";
const EXERCICE = `revision_fausses_${EXAMEN}`;
const ORDER = ["t3p:1", "gestion:1"];

const h = vi.hoisted(() => ({
  rows: [] as any[], saved: null as any, inserts: [] as any[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: async (_name: string, args: any) => {
    const st = h.saved?.reponses?.revisionState;
    const payload = {id: "receipt-1", apprenant_id: args.p_apprenant_id, quiz_id: args.p_examen_id,
      score_obtenu: h.saved?.score, details: { reponses: st?.answers, questionOrder: st?.questionOrder, revision_exercice_id: args.p_revision_exercice_id }};
    if (!h.inserts.length) h.inserts.push(payload);
    
    return {data: payload, error: null};
  }, from: (table: string) => {
    const query: any = {
      select: () => query,
      eq: () => query,
      like: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle: async () => ({ data: h.saved, error: null }),
      insert: async (payload: any) => {
        if (table !== "apprenant_quiz_results") throw new Error("Table d'insertion inattendue");
        h.inserts.push(payload);
        return { error: null };
      },
      then: (ok: any) => ok({ data: h.rows, error: null }),
    };
    return query;
  } },
}));
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

const etatInitial = () => creerRevisionProgressState({
  examenId: EXAMEN, answers: {}, currentIndex: 0, correctedCount: 0,
  correctedQuestions: [], showCorrection: false, questionOrder: ORDER,
});

function monter(onTerminer = vi.fn()) {
  return { onTerminer, ...render(<RevisionFausses wrongQuestions={wrongQuestions} onTerminer={onTerminer} apprenantId={APPRENANT} userId={USER} examenId={EXAMEN} />) };
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  h.rows = [{ exercice_id: EXERCICE, completed: false }];
  h.saved = { reponses: { revisionState: etatInitial() }, score: 0, completed: false };
  h.inserts = [];
  setAnswerSaveAuthToken("test-token", USER);
  setAnswerSaveOwnership({ apprenantId: APPRENANT, previewReadOnly: false });
});

describe("Révision fictive complète — file réelle et serveur simulé", () => {
  it("QCM + QRC, rechargement, déconnexion/reconnexion et double clic de clôture", async () => {
    let writeSeq = 0;
    let revisionSeq = 0;
    let releaseFirst: (() => void) | undefined;
    let first = true;
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      const apply = () => {
        if ((body.base_seq ?? 0) < revisionSeq) {
          return {
            ok: true,
            json: async () => ({ success: true, confirmed: true, write_seq: writeSeq, skipped_questions: ["revisionState"], stored_reponses: h.saved.reponses, accepted_event_ids: (body.events ?? []).map((event: any) => event.event_id) }),
            text: async () => "",
          };
        }
        writeSeq += 1;
        revisionSeq = writeSeq;
        h.saved = {
          reponses: body.reponses,
          score: body.score,
          completed: body.completed === true,
        };
        return {
          ok: true,
          json: async () => ({ success: true, confirmed: true, write_seq: writeSeq, skipped_questions: [], accepted_event_ids: (body.events ?? []).map((event: any) => event.event_id) }),
          text: async () => "",
        };
      };
      if (first) {
        first = false;
        return new Promise((resolve) => { releaseFirst = () => resolve(apply()); });
      }
      return Promise.resolve(apply());
    });
    vi.stubGlobal("fetch", fetchMock);

    const premier = monter();
    await screen.findByText("Question T3P");
    fireEvent.click(screen.getByText("Réponse B"));
    fireEvent.click(screen.getByRole("button", { name: "Valider ma réponse" }));
    await new Promise((resolve) => setTimeout(resolve, 450));
    fireEvent.click(screen.getByRole("button", { name: /Question suivante/ }));
    await screen.findByText("Question Gestion");
    fireEvent.change(screen.getByPlaceholderText("Saisissez votre réponse..."), { target: { value: "texte fictif" } });
    releaseFirst?.();
    await waitFor(() => expect(h.saved.reponses.revisionState.answers["gestion:1"]).toBe("texte fictif"), { timeout: 5000 });

    // Retour/rechargement avant la fin : la position et les deux réponses sont relues.
    premier.unmount();
    const second = monter();
    await screen.findByText("Question Gestion");
    expect(screen.getByDisplayValue("texte fictif")).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();

    // Déconnexion : la QRC reste locale ; reconnexion : elle est confirmée sans saisie à nouveau.
    setAnswerSaveAuthToken(null, USER);
    fireEvent.change(screen.getByPlaceholderText("Saisissez votre réponse..."), { target: { value: "texte fictif complet" } });
    expect(h.saved.reponses.revisionState.answers["gestion:1"]).toBe("texte fictif");
    setAnswerSaveAuthToken("test-token", USER);
    await waitFor(() => expect(h.saved.reponses.revisionState.answers["gestion:1"]).toBe("texte fictif complet"), { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: "Valider ma réponse" }));
    await new Promise((resolve) => setTimeout(resolve, 450));
    const terminer = screen.getByRole("button", { name: /Terminer la révision/ });
    fireEvent.click(terminer);
    fireEvent.click(terminer);
    await waitFor(() => expect(second.onTerminer).toHaveBeenCalledTimes(1), { timeout: 5000 });

    expect(h.saved.completed).toBe(true);
    expect(h.saved.score).toBe(2);
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0].details.revision_exercice_id).toBe(EXERCICE);
    expect(h.inserts[0].details.reponses).toEqual({ "t3p:1": ["B"], "gestion:1": "texte fictif complet" });
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1].body)));
    bodies.forEach((body, index) => expect(body.base_seq).toBe(index));
    expect(bodies.at(-1).completed).toBe(true);
    expect(new Set(bodies.map((body) => body.operation_id)).size).toBe(bodies.length);
    expect(JSON.parse(localStorage.getItem("answer_save_queue_v1") || "[]")).toHaveLength(0);
    second.unmount();
  }, 20000);
});
