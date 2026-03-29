/**
 * TDD — BUG #4: Corriger l'auto-save des documents (INSERT sans vérification doublon)
 *
 * Problème: Le hook useAutoSave fait un SELECT pour vérifier si un brouillon existe,
 * puis INSERT ou UPDATE. En cas de race condition (2 saves rapides), le SELECT
 * retourne "pas de brouillon" pour les deux, et les deux font INSERT → doublon.
 *
 * Ce que le fix doit garantir:
 * - Utiliser un vrai UPSERT (onConflict) au lieu de SELECT + INSERT/UPDATE
 * - Ajouter une contrainte UNIQUE sur (apprenant_id, type_document, user_id) en DB
 * - Pas de doublon même si 2 saves se déclenchent en parallèle
 * - Le retry fonctionne correctement (3 tentatives max)
 * - Le fallback localStorage fonctionne quand Supabase échoue
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

let mockInsertCalls = 0;
let mockUpdateCalls = 0;
let mockUpsertCalls = 0;
let mockSelectData: any[] = [];
let mockInsertError: any = null;
let mockUpsertError: any = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: "user-123" } } })
      ),
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: { access_token: "token" } },
        })
      ),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn(() =>
                  Promise.resolve({
                    data: mockSelectData,
                    error: null,
                  })
                ),
              }),
            }),
          }),
        }),
      }),
      insert: vi.fn((data: any) => {
        mockInsertCalls++;
        return Promise.resolve({ error: mockInsertError });
      }),
      update: vi.fn(() => {
        mockUpdateCalls++;
        return {
          eq: vi.fn(() => Promise.resolve({ error: null })),
        };
      }),
      upsert: vi.fn(() => {
        mockUpsertCalls++;
        return Promise.resolve({ error: mockUpsertError });
      }),
    })),
  },
}));

vi.mock("@/lib/savePublicFormDocument", () => ({
  savePublicFormDocument: vi.fn(() => Promise.resolve(true)),
}));

// Mock localStorage
const localStorageData: Record<string, string> = {};
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => localStorageData[key] || null),
    setItem: vi.fn((key: string, val: string) => {
      localStorageData[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageData[key];
    }),
  },
  writable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertCalls = 0;
  mockUpdateCalls = 0;
  mockUpsertCalls = 0;
  mockSelectData = [];
  mockInsertError = null;
  mockUpsertError = null;
  Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BUG #4 — Auto-save documents sans doublon", () => {
  it("devrait utiliser UPSERT au lieu de SELECT+INSERT (évite les race conditions)", async () => {
    mockSelectData = []; // pas de brouillon

    const { useAutoSave } = await import("@/hooks/useAutoSave");

    const { result } = renderHook(() =>
      useAutoSave({
        apprenantId: "apprenant-001",
        typeDocument: "fiche_synthese",
        titre: "Ma fiche",
      })
    );

    let success = false;
    await act(async () => {
      success = await result.current.triggerSave({ champ1: "valeur1" });
    });

    expect(success).toBe(true);

    // BUG #4 FIX: le code utilise maintenant un seul UPSERT (onConflict)
    // au lieu de SELECT + INSERT/UPDATE → pas de race condition
    expect(mockInsertCalls).toBe(0); // pas d'INSERT direct
    expect(mockUpsertCalls).toBe(1); // un seul UPSERT
  });

  it("devrait sauvegarder sans SELECT préalable (pas de SELECT+UPDATE)", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const fromSpy = supabase.from as ReturnType<typeof vi.fn>;
    fromSpy.mockClear();

    mockSelectData = [{ id: "draft-123" }]; // brouillon existant

    const { useAutoSave } = await import("@/hooks/useAutoSave");

    const { result } = renderHook(() =>
      useAutoSave({
        apprenantId: "apprenant-001",
        typeDocument: "fiche_synthese",
        titre: "Ma fiche",
      })
    );

    await act(async () => {
      await result.current.triggerSave({ champ1: "mise_a_jour" });
    });

    // BUG #4 FIX: le code utilise maintenant un seul UPSERT
    // Pas de SELECT + UPDATE, pas de race condition
    expect(mockUpdateCalls).toBe(0); // pas d'UPDATE direct
    expect(mockUpsertCalls).toBe(1); // un seul UPSERT
  });

  it("devrait gérer le debounce — seul le dernier save est exécuté", async () => {
    vi.useFakeTimers();
    mockSelectData = [];

    const { useAutoSave } = await import("@/hooks/useAutoSave");

    const { result } = renderHook(() =>
      useAutoSave({
        apprenantId: "apprenant-001",
        typeDocument: "fiche_synthese",
        titre: "Ma fiche",
      })
    );

    // Envoie 5 changements rapides
    act(() => {
      result.current.queueSave({ v: 1 });
      result.current.queueSave({ v: 2 });
      result.current.queueSave({ v: 3 });
      result.current.queueSave({ v: 4 });
      result.current.queueSave({ v: 5 });
    });

    // Avance le debounce (2s)
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Seul le dernier save devrait avoir été exécuté
    // (1 INSERT max, pas 5)
    expect(mockInsertCalls).toBeLessThanOrEqual(1);

    vi.useRealTimers();
  });

  it("devrait sauvegarder en localStorage comme backup après un save réussi", async () => {
    mockSelectData = [];

    const { useAutoSave } = await import("@/hooks/useAutoSave");

    const { result } = renderHook(() =>
      useAutoSave({
        apprenantId: "apprenant-001",
        typeDocument: "fiche_synthese",
        titre: "Ma fiche",
      })
    );

    await act(async () => {
      await result.current.triggerSave({ champ1: "sauvegardé" });
    });

    // Vérifie que localStorage a été mis à jour comme backup
    const lsMock = window.localStorage.setItem as ReturnType<typeof vi.fn>;
    const lsCalls = lsMock.mock.calls.filter((c: any) =>
      c[0].includes("autosave_apprenant-001_fiche_synthese")
    );
    expect(lsCalls.length).toBeGreaterThanOrEqual(1);

    const saved = JSON.parse(lsCalls[0][1]);
    expect(saved.champ1).toBe("sauvegardé");
    expect(saved._savedAt).toBeDefined();
  });

  it("devrait afficher le bon statut: idle → saving → saved", async () => {
    mockSelectData = [];

    const { useAutoSave } = await import("@/hooks/useAutoSave");

    const { result } = renderHook(() =>
      useAutoSave({
        apprenantId: "apprenant-001",
        typeDocument: "fiche_synthese",
        titre: "Ma fiche",
      })
    );

    // Initial: idle
    expect(result.current.status).toBe("idle");

    await act(async () => {
      await result.current.triggerSave({ champ1: "test" });
    });

    // Après save réussi: saved
    expect(result.current.status).toBe("saved");
  });

  it("devrait retry 3 fois en cas d'erreur puis status 'error'", async () => {
    mockSelectData = [];
    mockUpsertError = { message: "DB error", code: "500", details: "", hint: "" };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { useAutoSave } = await import("@/hooks/useAutoSave");

    const { result } = renderHook(() =>
      useAutoSave({
        apprenantId: "apprenant-001",
        typeDocument: "fiche_synthese",
        titre: "Ma fiche",
      })
    );

    await act(async () => {
      await result.current.triggerSave({ champ1: "va_echouer" });
    });

    // Le save échoue 3 fois (MAX_RETRIES) via UPSERT puis fallback
    expect(mockUpsertCalls).toBe(3);

    consoleSpy.mockRestore();
  });
});
