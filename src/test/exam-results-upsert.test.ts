/**
 * Sauvegarde des réponses d'examen — ARCHITECTURE ACTUELLE.
 *
 * Remplace l'ancien test « BUG #1 » (envoi direct depuis le hook) :
 * aujourd'hui, le hook met chaque sauvegarde dans la FILE DURABLE
 * (answerPersistence), qui l'envoie à l'Edge Function upsert-reponse-apprenant
 * et ne la retire qu'après confirmation explicite du serveur.
 *
 * Aucune donnée réelle : fetch, session et base sont simulés.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockFetch = vi.fn();
const submitQuizAttemptMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { user: { id: "user-123" }, access_token: "token-abc" } } }),
      ),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          }),
        }),
      }),
    })),
  },
}));

vi.mock("@/lib/quizAttempts", async (orig) => ({
  ...(await orig<typeof import("@/lib/quizAttempts")>()),
  submitQuizAttempt: (...args: unknown[]) => submitQuizAttemptMock(...args),
}));

const confirmed = () => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true, confirmed: true, write_seq: 1 }),
  text: () => Promise.resolve('{"success":true,"confirmed":true}'),
});

async function setup() {
  vi.resetModules();
  const persistence = await import("@/lib/answerPersistence");
  const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");
  // Identification réelle de l'élève (comme CoursPublic) + session connectée.
  persistence.setAnswerSaveOwnership({ apprenantId: "apprenant-001", previewReadOnly: false });
  persistence.setAnswerSaveAuthToken("token-abc", "user-123");
  const hook = renderHook(() =>
    useAutoSaveReponses({ apprenantId: "apprenant-001", exerciceId: "exam-abc", exerciceType: "examen_blanc" }),
  );
  return { persistence, hook };
}

const bodies = () => mockFetch.mock.calls.map(([, opts]) => JSON.parse(opts.body));

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
  mockFetch.mockImplementation(async () => confirmed());
  vi.stubGlobal("fetch", mockFetch);
  submitQuizAttemptMock.mockReset();
  submitQuizAttemptMock.mockResolvedValue(true);
});

describe("Sauvegarde des réponses d'examen — file durable + confirmation serveur", () => {
  it("envoie la sauvegarde à l'Edge Function upsert-reponse-apprenant", async () => {
    const { persistence, hook } = await setup();
    await act(async () => {
      hook.result.current.saveReponses({ "1": ["A"], "2": ["B"] }, 15);
      expect(await persistence.flushAnswerSavesAndWait("apprenant-001", "exam-abc", 3000)).toBe(true);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("upsert-reponse-apprenant");
    expect(options.method).toBe("POST");
    expect(bodies()[0]).toMatchObject({
      apprenant_id: "apprenant-001",
      exercice_id: "exam-abc",
      reponses: { "1": ["A"], "2": ["B"] },
      score: 15,
    });
    // Confirmé → retiré de la file
    expect(persistence.getPendingAnswers("apprenant-001", "exam-abc")).toBeNull();
  });

  it("deux sauvegardes consécutives ciblent le même (apprenant_id, exercice_id)", async () => {
    const { persistence, hook } = await setup();
    await act(async () => {
      hook.result.current.saveReponses({ "1": ["A"] }, 15);
      await persistence.flushAnswerSavesAndWait("apprenant-001", "exam-abc", 3000);
      hook.result.current.saveReponses({ "1": ["A"], "2": ["C"] }, 18);
      await persistence.flushAnswerSavesAndWait("apprenant-001", "exam-abc", 3000);
    });
    const b = bodies();
    expect(b).toHaveLength(2);
    expect(b[0].apprenant_id).toBe(b[1].apprenant_id);
    expect(b[0].exercice_id).toBe(b[1].exercice_id);
    expect(b[1].score).toBe(18);
  });

  it("n'envoie jamais score: null quand aucun score n'est fourni", async () => {
    const { persistence, hook } = await setup();
    await act(async () => {
      hook.result.current.saveReponses({ "1": ["A"], "2": ["B"] });
      await persistence.flushAnswerSavesAndWait("apprenant-001", "exam-abc", 3000);
    });
    const body = bodies().at(-1);
    expect(body).toBeDefined();
    expect("score" in body).toBe(false);
  });

  it("« Terminer » envoie d'abord les réponses puis valide via submit_quiz_attempt", async () => {
    const { hook } = await setup();
    let ok = false;
    await act(async () => {
      ok = await hook.result.current.markCompleted({ "1": ["A"] }, 20);
    });
    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(submitQuizAttemptMock).toHaveBeenCalledTimes(1);
    expect(submitQuizAttemptMock.mock.calls[0][0]).toMatchObject({
      apprenantId: "apprenant-001",
      exerciceId: "exam-abc",
      score: 20,
    });
  });

  it("chaque envoi porte updated_at", async () => {
    const { persistence, hook } = await setup();
    await act(async () => {
      hook.result.current.saveReponses({ "1": ["A"] }, 10);
      await persistence.flushAnswerSavesAndWait("apprenant-001", "exam-abc", 3000);
    });
    const body = bodies()[0];
    expect(body.updated_at).toBeDefined();
    expect(new Date(body.updated_at).getTime()).not.toBeNaN();
  });
});
