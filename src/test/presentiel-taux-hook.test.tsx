import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  subscription: undefined as (() => void) | undefined,
  selects: [] as string[],
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const data = () => table === "apprenants" ? { heures_elearning: 60, heures_presentiel: 0, heures_totales: 66, type_apprenant: "vtc-e" }
      : table === "emargements_fc" ? state.rows : [];
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
});