import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let auth: any = { user: { id: "admin-fictif" }, loading: false };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
const admins = new Set(["admin-fictif"]);
vi.mock("@/integrations/supabase/client", () => {
  const q = (table: string) => {
    const f: any = { _uid: "" };
    f.select = () => f;
    f.eq = (c: string, v: string) => { if (c === "user_id") f._uid = v; return table === "apprenant_module_completion" && c === "apprenant_id" ? Promise.resolve({ data: [{ module_id: 2, status: "in_progress", progress: 50 }], error: null }) : f; };
    f.maybeSingle = () => Promise.resolve({ data: admins.has(f._uid) ? { role: "admin" } : null, error: null });
    return f;
  };
  return { supabase: { from: q } };
});
import { JalonsPonderesCard } from "@/components/crm/apprenant-sections/JalonsPonderesCard";

describe("carte jalons : changement de compte", () => {
  it("admin voit la carte ; autre compte / déconnexion / chargement => masquée sans réutiliser le cache", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ui = () => <QueryClientProvider client={qc}><JalonsPonderesCard apprenantId="eleve-fictif" typeApprenant="vtc-e" /></QueryClientProvider>;
    const { rerender } = render(ui());
    await waitFor(() => expect(screen.getByText("21%")).toBeTruthy());
    auth = { user: { id: "eleve-compte" }, loading: false }; rerender(ui());
    expect(screen.queryByText(/Jalons pondérés/)).toBeNull();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByText(/Jalons pondérés/)).toBeNull();
    auth = { user: { id: "admin-fictif" }, loading: true }; rerender(ui());
    expect(screen.queryByText(/Jalons pondérés/)).toBeNull();
    auth = { user: null, loading: false }; rerender(ui());
    expect(screen.queryByText(/Jalons pondérés/)).toBeNull();
  });
});
