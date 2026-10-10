import { describe, it, expect, vi, beforeEach } from "vitest";

const state = { user: null as null | { id: string } };

vi.mock("@/integrations/supabase/client", () => {
  const query: any = {
    select: () => query,
    order: () => query,
    in: async () => ({ data: [], error: null }),
  };
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: { access_token: "perime" } } }),
        getUser: async () => ({ data: { user: state.user } }),
      },
      from: () => query,
    },
  };
});

import { loadSavedExamens } from "@/components/cours-en-ligne/ExamensBlancsEditor";

describe("Examens blancs : pas de fausse alerte « aucune version active »", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

  it("connexion expirée (jeton périmé) → refus « session », aucune erreur journalisée", async () => {
    state.user = null;
    const err: any = await loadSavedExamens().catch((e) => e);
    expect(err?.sessionAbsente).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("connexion valide et 0 version → vraie alerte conservée", async () => {
    state.user = { id: "fictif" };
    const err: any = await loadSavedExamens().catch((e) => e);
    expect(err?.sessionAbsente).toBeFalsy();
    expect(String(err?.message)).toContain("Aucune version active");
  });
});
