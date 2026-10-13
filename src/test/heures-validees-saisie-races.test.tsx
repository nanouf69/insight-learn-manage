import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h = vi.hoisted(() => ({ inserts: 0, insertError: null as any, user: "admin-fictif" as string | null, resolveInsert: null as null | (() => void) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: h.user ? { id: h.user } : null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      insert: () => ({ select: () => ({ single: () => new Promise((res) => { h.inserts += 1; h.resolveInsert = () => res(h.insertError ? { data: null, error: h.insertError } : { data: { id: "n1" }, error: null }); }) }) }),
    }),
  },
}));
import { HeuresPresentielValidees } from "@/components/crm/apprenant-sections/HeuresPresentielValidees";
import { HEURES_VALIDEES_EVENT } from "@/lib/heuresValideesAdmin";

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const inv = vi.spyOn(qc, "invalidateQueries");
  render(<QueryClientProvider client={qc}><HeuresPresentielValidees apprenantId="eleve-A" /></QueryClientProvider>);
  fireEvent.change(screen.getByPlaceholderText(/Heures/), { target: { value: "3" } });
  fireEvent.change(screen.getByPlaceholderText(/Motif/), { target: { value: "Séance théorie fictive" } });
  fireEvent.change(screen.getByLabelText("Date de présence"), { target: { value: "2026-09-20" } });
  fireEvent.change(screen.getByLabelText("Catégorie de présence"), { target: { value: "theorie" } });
  return { qc, inv };
}

describe("saisie présence admin — courses (fictif)", () => {
  beforeEach(() => { h.inserts = 0; h.insertError = null; h.user = "admin-fictif"; });
  it("double-clic = une seule insertion ; invalidation et événement seulement après confirmation", async () => {
    const { inv } = setup();
    const ev = vi.fn(); window.addEventListener(HEURES_VALIDEES_EVENT, ev);
    const btn = screen.getByRole("button", { name: /Valider les heures/ });
    fireEvent.click(btn); fireEvent.click(btn); fireEvent.click(btn);
    await waitFor(() => expect(h.inserts).toBe(1));
    expect(inv).not.toHaveBeenCalled(); expect(ev).not.toHaveBeenCalled();
    h.resolveInsert!();
    await waitFor(() => expect(ev).toHaveBeenCalledTimes(1));
    expect((ev.mock.calls[0][0] as CustomEvent).detail.apprenantId).toBe("eleve-A");
    const pred = (inv.mock.calls[0][0] as any).predicate;
    expect(pred({ queryKey: ["apprenant-taux-realisation", "eleve-A"] })).toBe(true);
    expect(pred({ queryKey: ["apprenant-taux-realisation", "eleve-B"] })).toBe(false);
    expect(h.inserts).toBe(1);
  });
  it("refus serveur : rien n'est rafraîchi ni annoncé comme enregistré", async () => {
    h.insertError = { message: "denied" };
    const { inv } = setup();
    const ev = vi.fn(); window.addEventListener(HEURES_VALIDEES_EVENT, ev);
    fireEvent.click(screen.getByRole("button", { name: /Valider les heures/ }));
    await waitFor(() => expect(h.inserts).toBe(1));
    h.resolveInsert!();
    await new Promise((r) => setTimeout(r, 20));
    expect(inv).not.toHaveBeenCalled(); expect(ev).not.toHaveBeenCalled();
  });
  it("session disparue (déconnexion / changement de compte) : aucune insertion", async () => {
    h.user = null;
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Valider les heures/ }));
    await new Promise((r) => setTimeout(r, 20));
    expect(h.inserts).toBe(0);
  });
  it("sans date/catégorie/motif : aucune valeur inventée, aucune insertion", async () => {
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><HeuresPresentielValidees apprenantId="eleve-C" /></QueryClientProvider>);
    fireEvent.change(screen.getAllByPlaceholderText(/Heures/).at(-1)!, { target: { value: "6" } });
    fireEvent.click(screen.getAllByRole("button", { name: /Valider les heures/ }).at(-1)!);
    await new Promise((r) => setTimeout(r, 20));
    expect(h.inserts).toBe(0);
  });
});
