import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WelcomeBanner } from "@/components/cours-en-ligne/motivation/WelcomeBanner";
import { ModulesProgressionEleve, useProgressionModulesEleve } from "@/components/cours-en-ligne/ModulesProgressionEleve";
import { progressionModulesEleve } from "@/lib/progressionModulesEleve";
import { getLearnerModuleDisplayState } from "@/lib/moduleUnlockLogic";
import { IDS_JEUX_LYON } from "@/lib/jeuxPedagogiques";

const mocks = vi.hoisted(() => ({ lire: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: (_: string, id: string) => ({ in: () => mocks.lire(id) }) }) }) } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const modules = [{ id: 1, nom: "Introduction" }, { id: 8, nom: "Pratique VTC" }];
function Compteurs({ compte }: { compte: string | null }) {
  const progression = useProgressionModulesEleve(compte, modules, () => true, true);
  return <><WelcomeBanner prenom="Fictif" formationLabel="VTC" xp={0} xpToday={0} streak={0} progression={progression} />
    <ModulesProgressionEleve progression={progression} onOuvrir={() => {}} estVerrouille={() => false} /></>;
}
describe("Compteurs élève canoniques", () => {
  it("100 % en cours sans validation serveur ne compte pas comme terminé", () => {
    const verdict = getLearnerModuleDisplayState({ loaded: true, serverCompleted: false, hasProgress: true, quizStats: { completedQuizzes: 9, totalQuizzes: 9 } });
    expect(progressionModulesEleve([{ id: 1, nom: "Introduction" }], () => verdict.isDone, new Set())).toMatchObject({ etat: "ok", termines: 0, total: 1 });
  });
  it("bandeau et bloc : 1/2 avec jeux restants, 2/2 après confirmation", async () => {
    let faits: string[] = [];
    mocks.lire.mockImplementation(async () => ({ data: faits.map((exercice_id) => ({ exercice_id, completed: true })), error: null }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><Compteurs compte="fictif-a" /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByTestId("bienvenue-modules")).toHaveTextContent("1/2"));
    expect(screen.getByTestId("modules-termines")).toHaveTextContent("1 module terminé sur 2");
    expect(screen.queryByText("Présence / pratique à réaliser")).not.toBeInTheDocument();
    faits = IDS_JEUX_LYON;
    act(() => { window.dispatchEvent(new Event("activite-registre-confirmee")); });
    await waitFor(() => expect(screen.getByTestId("bienvenue-modules")).toHaveTextContent("2/2"));
    expect(screen.getByTestId("modules-termines")).toHaveTextContent("2 modules terminés sur 2");
  });
  it("même tablette : aucun résultat du compte précédent pendant le changement", async () => {
    let resoudre: ((v: any) => void) | undefined;
    mocks.lire.mockImplementation((id: string) => id === "fictif-a"
      ? Promise.resolve({ data: IDS_JEUX_LYON.map((exercice_id) => ({ exercice_id, completed: true })), error: null })
      : new Promise((resolve) => { resoudre = resolve; }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={qc}><Compteurs compte="fictif-a" /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByTestId("bienvenue-modules")).toHaveTextContent("2/2"));
    view.rerender(<QueryClientProvider client={qc}><Compteurs compte="fictif-b" /></QueryClientProvider>);
    expect(screen.queryByTestId("bienvenue-modules")).not.toBeInTheDocument();
    expect(screen.queryByTestId("modules-termines")).not.toBeInTheDocument();
    await act(async () => { resoudre?.({ data: [], error: null }); });
    await waitFor(() => expect(screen.getByTestId("bienvenue-modules")).toHaveTextContent("1/2"));
    view.rerender(<QueryClientProvider client={qc}><Compteurs compte={null} /></QueryClientProvider>);
    expect(screen.queryByTestId("bienvenue-modules")).not.toBeInTheDocument();
  });
  it("échec de lecture : ni zéro ni tous terminés", async () => {
    mocks.lire.mockResolvedValue({ data: null, error: new Error("Indisponible") });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><Compteurs compte="fictif-a" /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByTestId("modules-indisponible")).toBeInTheDocument());
    expect(screen.queryByTestId("bienvenue-modules")).not.toBeInTheDocument();
    expect(screen.queryByText("Tous vos modules sont terminés")).not.toBeInTheDocument();
  });
});