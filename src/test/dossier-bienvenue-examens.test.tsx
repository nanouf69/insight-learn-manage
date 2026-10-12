// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  auth: { user: { id: "admin-fictif" } as { id: string } | null, loading: false },
  read: vi.fn(), pdf: vi.fn(), info: vi.fn(), error: vi.fn(), from: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/pdf/document-individuel", () => ({ generateDocumentIndividuelPdf: mocks.pdf }));
vi.mock("sonner", () => ({ toast: { info: mocks.info, error: mocks.error } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: mocks.from,
  auth: { getSession: async () => ({ data: { session: mocks.auth.user ? { user: mocks.auth.user } : null } }) },
} }));
import { DossierBienvenueButton } from "@/components/examens/DossierBienvenueButton";

const learner = { id: "candidat-fictif", nom: "EXEMPLE", prenom: "Test" };
const doc = { type_document: "dossier-bienvenue", titre: "Dossier enregistré", donnees: { signature: "fictive" }, completed_at: "2026-10-12T08:00:00Z" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.user = { id: "admin-fictif" };
  mocks.auth.loading = false;
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: mocks.read };
  mocks.from.mockReturnValue(chain);
  mocks.read.mockResolvedValue({ data: [doc], error: null });
});
afterEach(cleanup);

describe("Dossier de bienvenue — liste examens, données fictives", () => {
  it("génère le PDF uniquement au clic avec le dossier CRM intact", async () => {
    render(<DossierBienvenueButton apprenant={learner} />);
    fireEvent.click(screen.getByRole("button", { name: "Dossier de bienvenue" }));
    await waitFor(() => expect(mocks.pdf).toHaveBeenCalledWith(learner, doc));
    expect(mocks.from).toHaveBeenCalledWith("apprenant_documents_completes");
    expect(mocks.from.mock.results[0].value.eq).toHaveBeenCalledWith("apprenant_id", learner.id);
  });
  it("affiche le bouton en vert quand le dossier est rempli (lecture seule)", async () => {
    render(<DossierBienvenueButton apprenant={learner} />);
    const button = await waitFor(() => {
      const b = screen.getByRole("button", { name: "Dossier de bienvenue" });
      expect(b.className).toContain("border-emerald-500");
      return b;
    });
    expect(mocks.pdf).not.toHaveBeenCalled();
    expect(button.className).toContain("bg-emerald-50");
  });
  it("reste neutre quand le dossier est absent, jamais vert", async () => {
    mocks.read.mockResolvedValue({ data: [], error: null });
    render(<DossierBienvenueButton apprenant={learner} />);
    await waitFor(() => expect(mocks.from).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 10));
    expect(screen.getByRole("button", { name: "Dossier de bienvenue" }).className).not.toContain("emerald");
  });
  it("ne devient jamais vert si la lecture échoue (sans fallback silencieux ni fausse couleur)", async () => {
    mocks.read.mockResolvedValue({ data: null, error: new Error("lecture refusée") });
    render(<DossierBienvenueButton apprenant={learner} />);
    await waitFor(() => expect(mocks.from).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 10));
    expect(screen.getByRole("button", { name: "Dossier de bienvenue" }).className).not.toContain("emerald");
  });
  it("ne fabrique aucun PDF si absent", async () => {
    mocks.read.mockResolvedValue({ data: [], error: null });
    render(<DossierBienvenueButton apprenant={learner} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(mocks.info).toHaveBeenCalled());
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it("signale une erreur sans fallback", async () => {
    mocks.read.mockResolvedValue({ data: null, error: new Error("lecture refusée") });
    render(<DossierBienvenueButton apprenant={learner} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it("refuse une réponse après changement de compte", async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.read.mockReturnValue(new Promise(r => { resolve = r; }));
    const { rerender } = render(<DossierBienvenueButton apprenant={learner} />);
    fireEvent.click(screen.getByRole("button"));
    mocks.auth.user = { id: "autre-compte-fictif" };
    rerender(<DossierBienvenueButton apprenant={learner} />);
    resolve({ data: [doc], error: null });
    await waitFor(() => expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false));
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it("bloque déconnexion", () => {
    mocks.auth.user = null;
    render(<DossierBienvenueButton apprenant={learner} />);
    fireEvent.click(screen.getByRole("button"));
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("est placé dans chaque rangée sans modifier les colonnes ou filières", () => {
    const source = readFileSync("src/components/examens/ExamenReussitePage.tsx", "utf8");
    expect(source).toContain('<DossierBienvenueButton apprenant={apprenant} />');
    expect(source.indexOf('<DossierBienvenueButton apprenant={apprenant} />')).toBeGreaterThan(source.indexOf('{filtered.map((apprenant) =>'));
  });
});
