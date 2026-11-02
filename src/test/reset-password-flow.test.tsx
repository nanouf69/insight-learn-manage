// All authentication is simulated; no hosted accounts, emails or passwords are changed.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({
  updateUser: vi.fn(), signOut: vi.fn(),
  getSession: vi.fn(), onAuthStateChange: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
import ResetPassword from "@/pages/ResetPassword";

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/reset-password");
  auth.getSession.mockResolvedValue({ data: { session: { user: { id: "isolated-test" } } } });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
});
afterEach(cleanup);

async function openForm() {
  render(<MemoryRouter><ResetPassword /></MemoryRouter>);
  return await screen.findByLabelText("Nouveau mot de passe", { selector: "input" });
}

describe("Recovery password flow (isolated)", () => {
  it("reveals and hides both fields independently without changing the password", async () => {
    const password = await openForm();
    const confirmation = screen.getByLabelText("Confirmer le mot de passe");
    fireEvent.change(password, { target: { value: "Fictif123?" } });
    fireEvent.click(screen.getByRole("button", { name: "Afficher le nouveau mot de passe" }));
    expect((password as HTMLInputElement).type).toBe("text");
    expect((confirmation as HTMLInputElement).type).toBe("password");
    expect((password as HTMLInputElement).value).toBe("Fictif123?");
    fireEvent.click(screen.getByRole("button", { name: "Masquer le nouveau mot de passe" }));
    expect((password as HTMLInputElement).type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Afficher la confirmation du mot de passe" }));
    expect((confirmation as HTMLInputElement).type).toBe("text");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("keeps server weak-password refusals authoritative and allows explicit retry", async () => {
    auth.updateUser.mockResolvedValueOnce({ error: { code: "weak_password", reasons: ["pwned"], message: "Password is known to be weak" } });
    const password = await openForm();
    const confirmation = screen.getByLabelText("Confirmer le mot de passe");
    for (const field of [password, confirmation]) fireEvent.change(field, { target: { value: "Fictif123?" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await screen.findByRole("alert");
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(auth.updateUser).toHaveBeenCalledTimes(1);
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "Fictif123?" });
    for (const field of [password, confirmation]) fireEvent.change(field, { target: { value: "AutreFictif456!" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" }));
    expect(auth.updateUser).toHaveBeenLastCalledWith({ password: "AutreFictif456!" });
  });
});