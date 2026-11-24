import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CGVReglementForm from "@/components/cours-en-ligne/CGVReglementForm";
const h = vi.hoisted(() => ({ saved: null as any, old: false, readError: false, createdAt: "2026-11-24T16:42:00Z" as string | null, save: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/saveFormDocument", () => ({ saveFormDocument: h.save }));
vi.mock("@/lib/sendAdminNotification", () => ({ sendAdminNotification: h.notify }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  let confirming = false;
  const chain = {
    select: () => chain, eq: () => chain,
    maybeSingle: async () => ({ data: { created_at: h.createdAt }, error: null }),
    contains: () => { confirming = true; return chain; },
    limit: async () => ({ error: confirming && h.readError ? { message: "refused" } : null,
      data: confirming && h.saved ? [{ id: "new", donnees: { ...h.saved.donnees, ri_articles: h.saved.donnees.ri_articles.map((a: any) => ({ contenu: a.contenu, titre: a.titre, num: a.num })) } }]
        : h.old ? [{ id: "old", donnees: { ri_accepted: true } }] : [],
    }),
  };
  return chain;
} } }));
beforeEach(() => { h.saved = null; h.old = false; h.readError = false; h.createdAt = "2026-11-24T16:42:00Z"; h.save.mockReset(); h.notify.mockReset(); h.save.mockImplementation(async p => { h.saved = p; return true; }); });
afterEach(cleanup);
describe("Nouvelles acceptations et historiques du règlement", () => {
  it("new registration saves the 21-article version and only completes after readback, regardless of JSON key order", async () => {
    const complete = vi.fn();
    render(<CGVReglementForm apprenantId="fictional" apprenantNom="Fictif" apprenantPrenom="Élève" onComplete={complete} />);
    const checkboxes = await screen.findAllByRole("checkbox");
    expect(checkboxes.every(c => c.getAttribute("data-state") === "unchecked")).toBe(true);
    checkboxes.forEach(c => fireEvent.click(c));
    fireEvent.click(screen.getByRole("button", { name: /Signer et valider/ }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(h.saved.donnees.ri_version).toBe("services-pro-ri-2026-11-24-v2");
    expect(h.saved.donnees.ri_articles).toHaveLength(21);
    expect(h.saved.donnees.cgv_sections).toHaveLength(15);
  });
  it("server read failure cannot complete a new acceptance or send its notification", async () => {
    h.readError = true;
    const complete = vi.fn();
    render(<CGVReglementForm apprenantId="fictional" apprenantNom="Fictif" apprenantPrenom="Élève" onComplete={complete} />);
    (await screen.findAllByRole("checkbox")).forEach(c => fireEvent.click(c));
    fireEvent.click(screen.getByRole("button", { name: /Signer et valider/ }));
    await waitFor(() => expect(h.save).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: /Signer et valider/ })).not.toBeDisabled());
    expect(complete).not.toHaveBeenCalled();
    expect(h.notify).not.toHaveBeenCalled();
  });
  it("a historical acceptance is not rewritten or forced to accept article 21", async () => {
    h.old = true;
    const complete = vi.fn();
    render(<CGVReglementForm apprenantId="fictional" onComplete={complete} />);
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(h.save).not.toHaveBeenCalled();
    expect(h.notify).not.toHaveBeenCalled();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });
  it("an existing unsigned dossier keeps the original twenty articles, without retrospective article 21", async () => {
    h.createdAt = "2026-11-24T16:40:00Z";
    render(<CGVReglementForm apprenantId="fictional" apprenantNom="Ancien" apprenantPrenom="Fictif" onComplete={() => {}} />);
    (await screen.findAllByRole("checkbox")).forEach(c => fireEvent.click(c));
    fireEvent.click(screen.getByRole("button", { name: /Signer et valider/ }));
    await waitFor(() => expect(h.saved).not.toBeNull());
    expect(h.saved.donnees.ri_articles).toHaveLength(20);
    expect(h.saved.donnees.ri_version).toBe("services-pro-ri-historique-v1");
  });
  it("an unknown inscription date never requests acceptance of the new version", async () => {
    h.createdAt = null;
    render(<CGVReglementForm apprenantId="fictional" onComplete={() => {}} />);
    await screen.findByRole("alert");
    expect(h.save).not.toHaveBeenCalled();
    expect(h.notify).not.toHaveBeenCalled();
  });
});