import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
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
import { useStudentEffectiveHours } from "../hooks/useStudentEffectiveHours";
import StudentHoursTracker from "../components/cours-en-ligne/StudentHoursTracker";

describe("Taux présentiel de la fiche, lecture seule", () => {
  it("compte depuis le 6 octobre Paris avec les mêmes heures élève/admin et conserve les anciennes preuves", async () => {
    const id = "c048754d-9045-4ab6-b89f-a5ab26de314c";
    state.learner = { type_apprenant: "vtc-e", heures_elearning: 60 };
    state.rows = [];
    state.connections = [
      { started_at: "2026-10-05T09:00:00Z", ended_at: "2026-10-05T10:00:00Z" },
      { started_at: "2026-10-05T21:30:00Z", ended_at: "2026-10-05T22:30:00Z" },
      { started_at: "2026-10-06T09:00:00Z", ended_at: "2026-10-06T10:00:00Z" },
    ];
    state.activities = ["2026-10-05T09:30:00Z", "2026-10-05T22:10:00Z", "2026-10-06T09:30:00Z"].map(occurred_at => ({ action_type: "open_module", module_nom: "Cours", occurred_at }));
    const before = JSON.stringify({ connections: state.connections, activities: state.activities });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => ({ admin: useApprenantTauxRealisation(id), student: useStudentEffectiveHours(id, "vtc-e") }), { wrapper });
    await waitFor(() => expect(result.current.student.loading).toBe(false));
    expect(result.current.admin.data?.doneElearning).toBe(1.5);
    expect(result.current.student.formattedDone).toBe("1h30");
    expect(result.current.student.pct).toBe(result.current.admin.data?.pctElearning);
    expect(result.current.admin.data?.reqElearning).toBe(60);
    expect(result.current.admin.data?.modulesCompleted).toBe(0);
    expect(JSON.stringify({ connections: state.connections, activities: state.activities })).toBe(before);
    unmount(); client.clear();
  });
  it.each([["va-e", null, 7], ["vtc-e", 66, 66], ["vtc-e", 90, 90]])("élève et admin affichent le temps réel sans plafond (%s, contrat %s)", async (type, contract, required) => {
    state.learner = { type_apprenant: type, heures_elearning: contract };
    state.rows = [];
    state.connections = Array.from({ length: 5 }, (_, index) => ({
      started_at: `2026-10-0${index + 1}T09:00:00Z`, ended_at: `2026-10-0${index + 1}T16:00:00Z`, last_seen_at: `2026-10-0${index + 1}T16:00:00Z`,
    }));
    state.activities = Array.from({ length: 5 }, (_, index) => ({ action_type: "open_module", module_nom: "Cours", occurred_at: `2026-10-0${index + 1}T09:30:00Z` }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => ({ admin: useApprenantTauxRealisation("fictif"), student: useStudentEffectiveHours("fictif", type) }), { wrapper });
    await waitFor(() => expect(result.current.student.loading).toBe(false));
    expect(result.current.admin.data?.doneElearning).toBe(35);
    expect(result.current.student.faitHeures).toBe(35);
    expect(result.current.student.requis).toBe(required);
    expect(result.current.student.pct).toBe(result.current.admin.data?.pctElearning);
    expect(result.current.student.formattedDone).toBe("35h00");
    expect(result.current.admin.data?.modulesCompleted).toBe(0);
    unmount(); client.clear();
  });
  it("affiche 100% des heures sans déclarer les modules terminés", async () => {
    state.learner = { type_apprenant: "va-e", heures_elearning: 7 };
    state.rows = [];
    state.connections = [{ started_at: "2026-10-01T09:00:00Z", ended_at: "2026-10-01T16:00:00Z", last_seen_at: "2026-10-01T16:00:00Z" }];
    state.activities = [{ action_type: "open_module", module_nom: "Cours", occurred_at: "2026-10-01T09:30:00Z" }];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}><StudentHoursTracker apprenantId="fictif" typeApprenant="va-e" modulesCompleted={10} modulesTotal={11} /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByText("100%")).toBeTruthy());
    expect(screen.getByText("7h00")).toBeTruthy();
    expect(screen.getByText("Modules à valider")).toBeTruthy();
    expect(screen.queryByText("Formation terminée")).toBeNull();
    view.unmount(); client.clear();
  });
  it("passe de 0 à 50 puis 100% après les événements de signature sans valider de module", async () => {
    state.learner = { heures_elearning: 60, heures_presentiel: 0, heures_totales: 66, type_apprenant: "vtc-e" };
    state.connections = []; state.activities = [];
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
    const end = type === "va-e" ? "2026-10-01T16:00:00Z" : "2026-10-01T12:00:00Z";
    state.connections = [{ started_at: "2026-10-01T09:00:00Z", ended_at: end, last_seen_at: end }];
    state.activities = [{ action_type: "open_module", module_nom: "Cours", occurred_at: "2026-10-01T09:30:00Z" }];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => useApprenantTauxRealisation("fictif"), { wrapper });
    await waitFor(() => expect(result.current.data?.reqElearning).toBe(required));
    const done = type === "va-e" ? 7 : 3;
    expect(result.current.data?.doneElearning).toBe(done);
    expect(result.current.data?.pctElearning).toBe(Math.round(done * 100 / Number(required)));
    expect(result.current.data?.modulesCompleted).toBe(0);
    unmount(); client.clear();
  });
});