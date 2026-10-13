import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let auth: any = { user: { id: "admin-fictif" }, loading: false };
let examensKo = false;
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
const admins = new Set(["admin-fictif"]);
vi.mock("@/integrations/supabase/client", () => {
  const q = (table: string) => {
    const f: any = { _uid: "" };
    f.select = () => f;
    f.in = () => Promise.resolve({ data: [], error: null });
    f.eq = (c: string, v: string) => { if (c === "user_id") f._uid = v; return table === "apprenant_module_completion" && c === "apprenant_id" ? Promise.resolve({ data: [{ module_id: 2, status: "in_progress", progress: 50 }], error: null }) : f; };
    f.maybeSingle = () => Promise.resolve({ data: admins.has(f._uid) ? { role: "admin" } : null, error: null });
    return f;
  };
  const ch: any = { on: () => ch, subscribe: () => ch };
  return { supabase: { from: q, channel: () => ch, removeChannel: () => {} } };
});
vi.mock("@/lib/releveJalonsGel", async () => ({ ...(await vi.importActual<any>("@/lib/releveJalonsGel")), chargerEtatGel: async () => ({ etat: "actif" }) }));
vi.mock("@/components/cours-en-ligne/ModuleDetailView", () => ({ getInitialModuleContentForVolume: () => null }));
vi.mock("@/components/cours-en-ligne/useLiveExamens", () => ({
  fetchLiveExamens: async () => {
    if (examensKo) throw new Error("ko");
    return Array.from({ length: 6 }, (_, i) => ({ type: "VTC", numero: i + 1, matieres: [{ questions: Array.from({ length: 10 }, () => ({})) }] }));
  },
}));
vi.mock("@/lib/jalonsPedagogiques", async () => {
  const actual: any = await vi.importActual("@/lib/jalonsPedagogiques");
  const jp: any = await vi.importActual("@/lib/jalonsPonderes");
  const jv: any = await vi.importActual("@/lib/jalonsVolumes");
  return {
    ...actual,
    chargerCalculJalons: async () => {
      if (examensKo) throw new Error("ko");
      const parcours = jp.avecJalonPratique([26, 2, 3, 4, 35, 5, 60, 70, 8, 50]);
      const volumes = jv.construireVolumes("vtc", parcours, [], () => ({ cours: [], exercices: [] }), Array.from({ length: 6 }, (_, i) => ({ type: "VTC", numero: i + 1, matieres: [{ questions: Array.from({ length: 10 }, () => ({})) }] })));
      const poids = jp.calculerPoids("vtc", volumes.volumes);
      const completions = [{ module_id: 2, status: "in_progress", progress: 50 }, jp.completionPratique(0)];
      return { key: "vtc-e", filiere: "vtc", parcours, volumes: volumes.volumes, durees: jp.calculerDureesPrevisionnelles("vtc", volumes.volumes), limites: [], poids, completions, resultat: jp.calculerJalonsPonderes("vtc", parcours, completions, poids), pratique: { minutes: 0, progression: 0, dernierePreuve: null, source: "test" } };
    },
  };
});
import { JalonsPonderesCard } from "@/components/crm/apprenant-sections/JalonsPonderesCard";

describe("carte jalons : changement de compte et erreurs", () => {
  it("admin voit le taux calculé par volume ; autre compte / déconnexion / chargement => masquée", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ui = () => <QueryClientProvider client={qc}><JalonsPonderesCard apprenantId="eleve-fictif" typeApprenant="vtc-e" /></QueryClientProvider>;
    const { rerender } = render(ui());
    await waitFor(() => expect(screen.getByText(/%$/)).toBeTruthy());
    auth = { user: { id: "eleve-compte" }, loading: false }; rerender(ui());
    expect(screen.queryByText(/Jalons pondérés/)).toBeNull();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByText(/Jalons pondérés/)).toBeNull();
    auth = { user: { id: "admin-fictif" }, loading: true }; rerender(ui());
    expect(screen.queryByText(/Jalons pondérés/)).toBeNull();
    auth = { user: null, loading: false }; rerender(ui());
    expect(screen.queryByText(/Jalons pondérés/)).toBeNull();
  });
  it("erreur de lecture => message, jamais d'ancien pourcentage", async () => {
    examensKo = true; auth = { user: { id: "admin-fictif" }, loading: false };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><JalonsPonderesCard apprenantId="eleve-fictif" typeApprenant="vtc-e" /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByText(/données indisponibles/)).toBeTruthy());
    expect(screen.queryByText(/%$/)).toBeNull();
    examensKo = false;
  });
});
