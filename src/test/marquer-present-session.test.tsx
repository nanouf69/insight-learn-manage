import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarquerPresentButton } from "@/components/sessions/MarquerPresentButton";

const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
describe("Déclaration de présence depuis les absents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain = { update: mocks.update, eq: mocks.eq, select: mocks.select, single: mocks.single };
    mocks.from.mockReturnValue(chain); mocks.update.mockReturnValue(chain); mocks.eq.mockReturnValue(chain); mocks.select.mockReturnValue(chain);
    mocks.single.mockResolvedValue({ data: { id: "inscription", presence_pratique: "present" }, error: null });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  it("enregistre uniquement la présence de l'inscription et session choisies, puis relit la liste", async () => {
    const saved = vi.fn().mockResolvedValue(undefined);
    render(<MarquerPresentButton inscriptionId="inscription" sessionId="session" nom="Élève fictif" present={false} onSaved={saved} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(mocks.from.mock.calls).toEqual([["session_apprenants"]]);
    expect(mocks.update.mock.calls).toEqual([[{ presence_pratique: "present" }]]);
    expect(mocks.eq.mock.calls).toEqual([["id", "inscription"], ["session_id", "session"]]);
    expect(mocks.single).toHaveBeenCalledTimes(1);
  });
  it("ne confirme pas une écriture refusée", async () => {
    mocks.single.mockResolvedValue({ data: null, error: new Error("Refus") });
    const saved = vi.fn();
    render(<MarquerPresentButton inscriptionId="inscription" sessionId="session" nom="Test" present={false} onSaved={saved} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
    expect(saved).not.toHaveBeenCalled();
  });
  it("annuler ne modifie aucune donnée", () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<MarquerPresentButton inscriptionId="inscription" sessionId="session" nom="Test" present={false} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));
    expect(mocks.from).not.toHaveBeenCalled();
  });
});