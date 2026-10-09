import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  subscription: undefined as (() => void) | undefined,
  selects: [] as string[],
  learner: { heures_elearning: 60, heures_presentiel: 0, heures_totales: 66, type_apprenant: "vtc-e" } as Record<string, unknown>,
  connections: [] as Record<string, unknown>[],
  activities: [] as Record<string, unknown>[],
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const data = () => table === "apprenants" ? state.learner
      : table === "emargements_fc" ? state.rows
      : table === "apprenant_connexions" ? state.connections
      : table === "apprenant_module_activites" ? state.activities : [];
    const builder: Record<string, unknown> = {};
    for (const method of ["eq", "filter", "range"]) builder[method] = () => builder;
    builder.select = (columns: string) => { if (table === "emargements_fc") state.selects.push(columns); return builder; };
    builder.maybeSingle = () => builder;
    builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: data(), error: null }).then(resolve);
    return builder;
  },
  channel: () => ({ on: (_event: string, _filter: unknown, callback: () => void) => {
    state.subscription = callback;
    return { subscribe: () => ({}) };
  }}),
  removeChannel: vi.fn(),
}}));
vi.mock("@/lib/pratiqueSlots", () => ({ fetchPratiqueSlotDetails: async () => [{
  date: "2026-10-09", typeFormation: "vtc", reservationCreneau: "journee", minutes: 360,
  parts: [{ creneau: "matin", minutes: 180, label: "9h-12h" }, { creneau: "apres_midi", minutes: 180, label: "13h-16h" }],
}] }));
vi.mock("@/components/cours-en-ligne/modules-config", () => ({ FORMATION_MODULES: { "vtc-e": { modules: [] } } }));
import { useApprenantTauxRealisation } from "../hooks/useApprenantTauxRealisation";

describe("Taux présentiel de la fiche, lecture seule", () => {
  it("passe de 0 à 50 puis 100% après les événements de signature sans valider de module", async () => {
    state.rows = [{ date_emargement: "2026-10-09", demi_journee: "matin", absent: false, signature_data_url: null }];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => useApprenantTauxRealisation("fictif"), { wrapper });
    await waitFor(() => expect(result.current.data?.reqPresentiel).toBe(6));
    expect(result.current.data?.donePresentiel).toBe(0);
    state.rows = [{ ...state.rows[0], signature_data_url: "data:image/png;base64,fictif" }];
    act(() => state.subscription?.());
    await waitFor(() => expect(result.current.data?.pctPresentiel).toBe(50));
    expect(result.current.data?.donePresentiel).toBe(3);
    state.rows.push({ date_emargement: "2026-10-09", demi_journee: "apres_midi", absent: false, signature_data_url: "data:image/png;base64,fictif" });
    act(() => state.subscription?.());
    await waitFor(() => expect(result.current.data?.pctPresentiel).toBe(100));
    expect(result.current.data?.donePresentiel).toBe(6);
    expect(result.current.data?.doneElearning).toBe(0);
    expect(result.current.data?.modulesCompleted).toBe(0);
    expect(state.selects.every((columns) => columns.includes("signature_data_url"))).toBe(true);
    unmount();
    client.clear();
  });
  it.each([["vtc-e", 60], ["taxi-e", 90], ["va-e", 7], ["ta-e", 35]])("affiche des heures requises pour %s sans valider de module", async (type, required) => {
    state.learner = { type_apprenant: type, heures_elearning: null, heures_presentiel: null, heures_totales: null };
    state.rows = [];
    state.connections = [{ started_at: "2026-10-01T09:00:00Z", ended_at: "2026-10-01T12:00:00Z", last_seen_at: "2026-10-01T12:00:00Z" }];
    state.activities = [{ action_type: "open_module", module_nom: "Cours", occurred_at: "2026-10-01T09:30:00Z" }];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => useApprenantTauxRealisation("fictif"), { wrapper });
    await waitFor(() => expect(result.current.data?.reqElearning).toBe(required));
    expect(result.current.data?.doneElearning).toBe(3);
    expect(result.current.data?.pctElearning).toBe(Math.round(300 / Number(required)));
    expect(result.current.data?.modulesCompleted).toBe(0);
    unmount(); client.clear();
  });
});