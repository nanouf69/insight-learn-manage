/**
 * Renvoi automatique des réponses d'examen — ARCHITECTURE ACTUELLE.
 *
 * Remplace l'ancien test « BUG #6 » : le renvoi n'est plus dans le hook mais
 * dans la file durable. Une réponse non confirmée par le serveur reste en file
 * (jamais supprimée) et est renvoyée jusqu'à confirmation.
 *
 * Aucune donnée réelle : fetch et session simulés.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockFetch = vi.fn();

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

const confirmed = () => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true, confirmed: true, write_seq: 1 }),
  text: () => Promise.resolve("{}"),
});

async function setup() {
  vi.resetModules();
  const persistence = await import("@/lib/answerPersistence");
  const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");
  persistence.setAnswerSaveOwnership({ apprenantId: "apprenant-001", previewReadOnly: false });
  persistence.setAnswerSaveAuthToken("token-abc", "user-123");
  const hook = renderHook(() =>
    useAutoSaveReponses({ apprenantId: "apprenant-001", exerciceId: "exam-abc", exerciceType: "examen_blanc" }),
  );
  return { persistence, hook };
}

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubGlobal("navigator", { ...navigator, onLine: true });
});

describe("Renvoi automatique — file durable", () => {
  it("réussit du premier coup quand le réseau fonctionne", async () => {
    mockFetch.mockImplementation(async () => confirmed());
    const { persistence, hook } = await setup();
    await act(async () => {
      hook.result.current.saveReponses({ "1": ["A"] }, 10);
      expect(await persistence.flushAnswerSavesAndWait("apprenant-001", "exam-abc", 3000)).toBe(true);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("upsert-reponse-apprenant");
  });

  it("en cas d'échec réseau répété, la réponse reste en file (jamais perdue)", async () => {
    mockFetch.mockRejectedValue(new Error("Failed to fetch"));
    const { persistence, hook } = await setup();
    let flushed = true;
    await act(async () => {
      hook.result.current.saveReponses({ "1": ["A"] }, 10);
      flushed = await persistence.flushAnswerSavesAndWait("apprenant-001", "exam-abc", 1500);
    });
    expect(flushed).toBe(false);
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(persistence.getPendingAnswers("apprenant-001", "exam-abc")).toEqual({ "1": ["A"] });
    expect(persistence.getPendingAnswerSavesFor("apprenant-001", "exam-abc")).toBe(1);
  });

  it("réussit dès que le serveur revient, puis vide la file", async () => {
    let n = 0;
    mockFetch.mockImplementation(async () => {
      n += 1;
      if (n <= 2) throw new Error("Failed to fetch");
      return confirmed();
    });
    const { persistence, hook } = await setup();
    let flushed = false;
    await act(async () => {
      hook.result.current.saveReponses({ "1": ["A"] }, 10);
      flushed = await persistence.flushAnswerSavesAndWait("apprenant-001", "exam-abc", 3000);
    });
    expect(flushed).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(persistence.getPendingAnswers("apprenant-001", "exam-abc")).toBeNull();
  });

  it("une réponse HTTP 200 sans confirmation explicite n'est pas considérée comme enregistrée", async () => {
    mockFetch.mockImplementation(async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => "{}" }));
    const { persistence, hook } = await setup();
    let flushed = true;
    await act(async () => {
      hook.result.current.saveReponses({ "1": ["B"] }, 10);
      flushed = await persistence.flushAnswerSavesAndWait("apprenant-001", "exam-abc", 800);
    });
    expect(flushed).toBe(false);
    expect(persistence.getPendingAnswers("apprenant-001", "exam-abc")).toEqual({ "1": ["B"] });
  });
});
