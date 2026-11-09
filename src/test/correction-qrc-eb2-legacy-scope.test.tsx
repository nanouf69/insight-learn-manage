import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminCorrectionQrcV2Reel from "@/pages/AdminCorrectionQrcV2Reel";

const mocks = vi.hoisted(() => ({ props: [] as any[], charger: vi.fn() }));
vi.mock("@/components/cours-en-ligne/CorrectionQRCTab", () => ({ default: (props: any) => { mocks.props.push(props); return <div data-testid="legacy-reader">{props.resultIds.join(",")}</div>; } }));
vi.mock("@/features/correction-qrc-v2/noyauReel", async importOriginal => ({
  ...await importOriginal<typeof import("@/features/correction-qrc-v2/noyauReel")>(),
  listerGroupesCrm: async () => [{ cle: "jour", type: "crm", libelle: "Novembre journée", debut: "2026-11-02", fin: "2026-11-13", tri: "2026-11-02", nbCandidats: 2, examens: [{
    cle: "jour::EB2::ancien", exam_id: "EB2", circuit: "ancien", attemptIds: ["ancien:r1","ancien:r2"], legacyResultIds: ["r1","r2"],
    apprenantParAttempt: { "ancien:r1": "a", "ancien:r2": "b" }, dates: [
      { jour: "2026-11-03", date: "03/11/2026", attemptIds: ["ancien:r1"] },
      { jour: "2026-11-09", date: "09/11/2026", attemptIds: ["ancien:r2"] },
    ],
  }] }],
  chargerSessionTest: mocks.charger, souscrireSignal: () => () => undefined,
}));
vi.mock("@/features/correction-qrc-v2/correctionIa", () => ({
  lireConfigIa: async () => ({ actif: false }), lireCorrectionsIa: async () => [], lireDemandesVerification: async () => [],
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { email: "admin@fictif.test" } } }) },
  from: () => ({ select: () => ({ in: async () => ({ data: [{ id: "a", nom: "Alpha", prenom: "Fictif" }, { id: "b", nom: "Beta", prenom: "Fictif" }], error: null }) }) }),
} }));
beforeEach(() => { mocks.props = []; mocks.charger.mockReset(); window.history.replaceState(null,"","/admin/correction-qrc-v2?qrc_groupe=jour&qrc_eb=jour%3A%3AEB2%3A%3Aancien"); });
describe("Scoped historical EB2 reader", () => {
  it("opens only authorized result IDs, not the V2 loader", async () => {
    render(<AdminCorrectionQrcV2Reel />);
    expect(await screen.findByTestId("legacy-reader")).toHaveTextContent("r1,r2");
    expect(mocks.props.at(-1).hideV2Panel).toBe(true);
    expect(mocks.charger).not.toHaveBeenCalled();
  });
  it("filters by original date IDs and restores the same scope after reload", async () => {
    const { unmount } = render(<AdminCorrectionQrcV2Reel />);
    fireEvent.click(await screen.findByTestId("date-2026-11-03"));
    await waitFor(() => expect(screen.getByTestId("legacy-reader")).toHaveTextContent(/^r1$/));
    expect(window.location.search).toContain("qrc_date=2026-11-03");
    unmount(); render(<AdminCorrectionQrcV2Reel />);
    expect(await screen.findByTestId("legacy-reader")).toHaveTextContent(/^r1$/);
    fireEvent.click(screen.getByTestId("date-toutes"));
    await waitFor(() => expect(screen.getByTestId("legacy-reader")).toHaveTextContent("r1,r2"));
  });
});