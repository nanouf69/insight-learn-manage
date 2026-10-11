import { describe, it, expect, vi } from "vitest";

// Données 100 % fictives : 1re lecture « visiteur » (0 ligne), 2e lecture après
// renouvellement du jeton → contenu présent, aucune fausse alerte.
let appels = 0;
vi.mock("@/integrations/supabase/client", () => {
  const query: any = {
    select: () => query,
    order: () => query,
    in: async () => {
      appels += 1;
      return appels === 1
        ? { data: [], error: null }
        : { data: [{ module_id: 999999, module_data: null, updated_at: null }], error: null };
    },
    eq: () => query,
    then: undefined,
  };
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: { access_token: "fictif" } } }),
        getUser: async () => ({ data: { user: { id: "fictif" } } }),
      },
      from: () => query,
    },
  };
});

import { loadSavedExamens } from "@/components/cours-en-ligne/ExamensBlancsEditor";

describe("Examens blancs : relecture unique après renouvellement du jeton", () => {
  it("n'émet pas « Aucune version active » si la relecture trouve des lignes", async () => {
    const err: any = await loadSavedExamens().then(() => null).catch((e) => e);
    expect(appels).toBeGreaterThanOrEqual(2);
    expect(String(err?.message ?? "")).not.toContain("Aucune version active");
  });
});
