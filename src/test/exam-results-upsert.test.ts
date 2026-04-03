/**
 * TDD — BUG #1: Remplacer INSERT par UPSERT avec contrainte UNIQUE
 *
 * Problème: Des INSERT sans vérification de doublon sur `reponses_apprenants`
 * causent des pertes de scores (lignes dupliquées, score écrasé à null).
 *
 * Ce que le fix doit garantir:
 * - useAutoSaveReponses utilise un UPSERT (onConflict: apprenant_id,exercice_id)
 * - Un deuxième appel avec le même (apprenant_id, exercice_id) met à jour la ligne existante
 * - Le score n'est jamais perdu lors d'une sauvegarde ultérieure sans score
 * - La contrainte UNIQUE (apprenant_id, exercice_id) est respectée côté DB
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: { user: { id: "user-123" }, access_token: "token-abc" } },
        })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
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

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve("{}") });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BUG #1 — UPSERT réponses examens (pas INSERT)", () => {
  it("devrait appeler l'Edge Function upsert-reponse-apprenant", async () => {
    const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");
    const { renderHook, act } = await import("@testing-library/react");

    const { result } = renderHook(() =>
      useAutoSaveReponses({
        apprenantId: "apprenant-001",
        exerciceId: "exam-abc",
        exerciceType: "examen_blanc",
      })
    );

    await act(async () => {
      result.current.saveReponses({ "1": ["A"], "2": ["B"] }, 15);
      await new Promise((r) => setTimeout(r, 500));
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("upsert-reponse-apprenant");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.apprenant_id).toBe("apprenant-001");
    expect(body.exercice_id).toBe("exam-abc");
    expect(body.score).toBe(15);
  });

  it("devrait envoyer le même (apprenant_id, exercice_id) pour 2 saves consécutifs", async () => {
    const callBodies: any[] = [];
    mockFetch.mockImplementation(async (_url: string, opts: any) => {
      callBodies.push(JSON.parse(opts.body));
      return { ok: true, text: () => Promise.resolve("{}") };
    });

    const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");
    const { renderHook, act } = await import("@testing-library/react");

    const { result } = renderHook(() =>
      useAutoSaveReponses({
        apprenantId: "apprenant-001",
        exerciceId: "exam-abc",
        exerciceType: "examen_blanc",
      })
    );

    // Premier save
    await act(async () => {
      result.current.saveReponses({ "1": ["A"] }, 15);
      await new Promise((r) => setTimeout(r, 500));
    });

    // Deuxième save (même exercice, score mis à jour)
    await act(async () => {
      result.current.saveReponses({ "1": ["A"], "2": ["C"] }, 18);
      await new Promise((r) => setTimeout(r, 500));
    });

    // Les deux appels ciblent le même (apprenant_id, exercice_id)
    expect(callBodies.length).toBe(2);
    expect(callBodies[0].apprenant_id).toBe(callBodies[1].apprenant_id);
    expect(callBodies[0].exercice_id).toBe(callBodies[1].exercice_id);
    // Le deuxième appel a le score mis à jour
    expect(callBodies[1].score).toBe(18);
  });

  it("ne devrait PAS envoyer score: null quand aucun score n'est fourni (préserve le score existant)", async () => {
    const callBodies: any[] = [];
    mockFetch.mockImplementation(async (_url: string, opts: any) => {
      callBodies.push(JSON.parse(opts.body));
      return { ok: true, text: () => Promise.resolve("{}") };
    });

    const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");
    const { renderHook, act } = await import("@testing-library/react");

    const { result } = renderHook(() =>
      useAutoSaveReponses({
        apprenantId: "apprenant-001",
        exerciceId: "exam-abc",
        exerciceType: "examen_blanc",
      })
    );

    // Save SANS score (auto-save intermédiaire typique — l'élève tape une réponse)
    await act(async () => {
      result.current.saveReponses({ "1": ["A"], "2": ["B"] });
      await new Promise((r) => setTimeout(r, 500));
    });

    // BUG ACTUEL: le hook envoie score: null → l'edge function écrase le score en DB
    // FIX ATTENDU: quand aucun score n'est fourni, ne pas inclure le champ score
    // dans le payload, OU l'edge function doit utiliser COALESCE pour préserver
    // le score existant.
    const body = callBodies[callBodies.length - 1];

    // Le champ score ne doit PAS être null — soit absent, soit undefined
    // Ce test ÉCHOUERA tant que le bug existe (le hook envoie score: null)
    expect(body.score === null).toBe(false);
  });

  it("devrait marquer completed=true lors du markCompleted", async () => {
    const callBodies: any[] = [];
    mockFetch.mockImplementation(async (_url: string, opts: any) => {
      callBodies.push(JSON.parse(opts.body));
      return { ok: true, text: () => Promise.resolve("{}") };
    });

    const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");
    const { renderHook, act } = await import("@testing-library/react");

    const { result } = renderHook(() =>
      useAutoSaveReponses({
        apprenantId: "apprenant-001",
        exerciceId: "exam-abc",
        exerciceType: "examen_blanc",
      })
    );

    await act(async () => {
      result.current.markCompleted({ "1": ["A"], "2": ["B"] }, 17);
      await new Promise((r) => setTimeout(r, 500));
    });

    expect(callBodies.length).toBeGreaterThanOrEqual(1);
    const body = callBodies[callBodies.length - 1];
    expect(body.completed).toBe(true);
    expect(body.score).toBe(17);
  });

  it("devrait inclure updated_at dans chaque payload", async () => {
    const callBodies: any[] = [];
    mockFetch.mockImplementation(async (_url: string, opts: any) => {
      callBodies.push(JSON.parse(opts.body));
      return { ok: true, text: () => Promise.resolve("{}") };
    });

    const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");
    const { renderHook, act } = await import("@testing-library/react");

    const { result } = renderHook(() =>
      useAutoSaveReponses({
        apprenantId: "apprenant-001",
        exerciceId: "exam-abc",
        exerciceType: "examen_blanc",
      })
    );

    await act(async () => {
      result.current.saveReponses({ "1": ["A"] }, 10);
      await new Promise((r) => setTimeout(r, 500));
    });

    const body = callBodies[0];
    expect(body.updated_at).toBeDefined();
    // Vérifie que c'est un ISO string valide
    expect(new Date(body.updated_at).toISOString()).toBe(body.updated_at);
  });
});
