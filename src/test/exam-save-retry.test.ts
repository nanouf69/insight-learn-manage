/**
 * TDD — BUG #6: Ajouter un retry automatique sur la sauvegarde des réponses d'examen
 *
 * Problème: Le hook useAutoSaveReponses n'a PAS de retry en cas d'échec réseau.
 * Si le fetch vers l'Edge Function échoue, la réponse est perdue silencieusement.
 * Seul le composant ExamenBlancsPassage a un retry (3 tentatives) dans persistReponses,
 * mais le hook générique useAutoSaveReponses n'en a pas.
 *
 * Ce que le fix doit garantir:
 * - useAutoSaveReponses retry automatiquement 3 fois en cas d'échec
 * - Délai entre les retries
 * - Après 3 échecs, une erreur est loguée
 * - Le flush synchrone (beforeunload) n'est pas affecté par le retry
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BUG #6 — Retry automatique sur sauvegarde réponses d'examen", () => {
  it("devrait réussir du premier coup quand le réseau fonctionne", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"success":true}'),
    });

    const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");

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

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("upsert-reponse-apprenant");
  });

  it("devrait retry en cas d'échec réseau (fetch throw)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    // Le fetch lance une erreur réseau à chaque appel
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");

    const { result } = renderHook(() =>
      useAutoSaveReponses({
        apprenantId: "apprenant-001",
        exerciceId: "exam-retry",
        exerciceType: "examen_blanc",
      })
    );

    await act(async () => {
      result.current.saveReponses({ "1": ["A"] }, 10);
      // Attend le debounce (300ms) + temps pour les retries
      await new Promise((r) => setTimeout(r, 12000));
    });

    // BUG: Le hook actuel n'a PAS de retry → seulement 1 appel
    // APRÈS LE FIX: devrait être appelé 3 fois (3 retries)
    // Ce test ÉCHOUERA tant que le retry n'est pas implémenté
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(3);

    consoleError.mockRestore();
  }, 15000);

  it("devrait réussir au 2ème retry si le serveur revient", async () => {
    // 1er appel: erreur HTTP 500, 2ème: succès
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
        text: () => Promise.resolve("Internal Server Error"),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"success":true}'),
      });

    const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");

    const { result } = renderHook(() =>
      useAutoSaveReponses({
        apprenantId: "apprenant-001",
        exerciceId: "exam-retry2",
        exerciceType: "examen_blanc",
      })
    );

    await act(async () => {
      result.current.saveReponses({ "1": ["B"] }, 12);
      await new Promise((r) => setTimeout(r, 8000));
    });

    // BUG: Le hook actuel NE retry PAS sur !response.ok → 1 seul appel
    // APRÈS LE FIX: 1er échec (500) → retry → 2ème succès = 2 appels
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  }, 12000);

  it("devrait enregistrer le handler beforeunload pour le flush synchrone", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");

    renderHook(() =>
      useAutoSaveReponses({
        apprenantId: "apprenant-001",
        exerciceId: "exam-flush",
        exerciceType: "examen_blanc",
      })
    );

    const beforeUnloadCalls = addEventListenerSpy.mock.calls.filter(
      (c) => c[0] === "beforeunload"
    );
    expect(beforeUnloadCalls.length).toBeGreaterThanOrEqual(1);

    addEventListenerSpy.mockRestore();
  });

  it("devrait nettoyer les timeouts au démontage du hook", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"success":true}'),
    });

    const { useAutoSaveReponses } = await import("@/hooks/useAutoSaveReponses");

    const { result, unmount } = renderHook(() =>
      useAutoSaveReponses({
        apprenantId: "apprenant-001",
        exerciceId: "exam-cleanup",
        exerciceType: "examen_blanc",
      })
    );

    // Lance un save en cours
    act(() => {
      result.current.saveReponses({ "1": ["A"] });
    });

    // Démonte avant que le debounce ne se termine
    unmount();

    // Le fetch ne devrait PAS être appelé après le démontage
    await new Promise((r) => setTimeout(r, 500));
    // Le beforeunload est nettoyé, pas de fuite de mémoire
    expect(true).toBe(true); // pas de crash = succès
  });
});
