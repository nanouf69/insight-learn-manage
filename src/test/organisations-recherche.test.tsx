import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OrganisationsList } from "@/components/organisations/OrganisationsList";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    isLoading: false,
    data: queryKey[0] === "organismes" ? [
      { id: "fiction-1", nom: "École Transport Lyon", ville: "Lyon", email: "ecole@example.test", siret: "11111111111111" },
      { id: "fiction-2", nom: "Taxi Exemple", ville: "Paris", email: "taxi@example.test", siret: "22222222222222" },
    ] : [],
  }),
}));
vi.mock("@/components/organisations/OrganisationForm", () => ({ OrganisationForm: () => null }));
vi.mock("@/components/organisations/DevisOrganisationSection", () => ({ DevisOrganisationSection: () => null }));

afterEach(cleanup);
describe("Recherche d’organisations sans écriture", () => {
  it("retrouve le nom sans tenir compte des accents ou majuscules et permet de revenir à toutes les organisations", () => {
    render(<OrganisationsList />);
    fireEvent.change(screen.getByRole("textbox", { name: "Rechercher une organisation" }), { target: { value: "ECOLE lyon" } });
    expect(screen.getByRole("heading", { name: "École Transport Lyon" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Taxi Exemple" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Effacer la recherche" }));
    expect(screen.getByRole("heading", { name: "Taxi Exemple" })).toBeTruthy();
  });

  it("filtre les coordonnées et conserve la liste après une recherche sans résultat", () => {
    render(<OrganisationsList />);
    const input = screen.getByRole("textbox", { name: "Rechercher une organisation" });
    for (const value of ["Paris", "taxi@example.test", "22222222222222"]) {
      fireEvent.change(input, { target: { value } });
      expect(screen.getByRole("heading", { name: "Taxi Exemple" })).toBeTruthy();
      expect(screen.queryByRole("heading", { name: "École Transport Lyon" })).toBeNull();
    }
    fireEvent.change(input, { target: { value: "introuvable" } });
    expect(screen.queryByRole("heading", { name: "Taxi Exemple" })).toBeNull();
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByRole("heading", { name: "Taxi Exemple" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "École Transport Lyon" })).toBeTruthy();
  });
});