import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const state = vi.hoisted(() => ({
  heuresValidees: [] as Record<string, unknown>[],
  learner: { heures_elearning: 60, heures_presentiel: 6, heures_totales: 66, type_apprenant: "vtc-e" } as Record<string, unknown>,
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const data = () => table === "apprenants" ? state.learner
      : table === "presentiel_heures_validees" ? state.heuresValidees
      : [];
    const builder: Record<string, unknown> = {};
    for (const method of ["eq", "filter", "range", "select"]) builder[method] = () => builder;
    builder.maybeSingle = () => builder;
    builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: data(), error: null }).then(resolve);
    return builder;
  },
  channel: () => {
    const channel = { on: () => channel, subscribe: () => channel };
    return channel;
  },
  removeChannel: vi.fn(() => Promise.resolve("ok")),
}}));
vi.mock("@/lib/pratiqueSlots", () => ({ fetchPratiqueSlotDetails: async () => [] }));
vi.mock("@/components/cours-en-ligne/modules-config", () => ({ FORMATION_MODULES: { "vtc-e": { modules: [] } } }));

import { useApprenantTauxRealisation } from "../hooks/useApprenantTauxRealisation";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("Heures de présence validées manuellement", () => {
  it("s'ajoutent aux heures signées sans les remplacer", async () => {
    state.heuresValidees = [{ heures: 6 }, { heures: 3.5 }];
    const { result } = renderHook(() => useApprenantTauxRealisation("app-1"), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.heuresPresentielValidees).toBe(9.5);
    // Aucune signature : les heures validées comptent seules dans le présentiel
    expect(result.current.data?.donePresentiel).toBe(9.5);
    expect(result.current.data?.pctPresentiel).toBe(100);
  });

  it("sans validation manuelle, le présentiel reste à zéro", async () => {
    state.heuresValidees = [];
    const { result } = renderHook(() => useApprenantTauxRealisation("app-2"), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.heuresPresentielValidees).toBe(0);
    expect(result.current.data?.donePresentiel).toBe(0);
  });
});
