import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn(() => { throw new Error("aucun appel réel"); }) } }));
import { BilanCorrigeActuel } from "@/components/cours-en-ligne/BilanCorrigeActuel";
const ch = (k: string[]) => ["x", "y", "z"].map((texte, i) => ({ lettre: "ABC"[i], texte, correct: k.includes("ABC"[i]) }));
const Q = { uid: "u18", type: "QCM", enonce: "Q18", choix: ch(["A"]) };
const payload = (key: string[], enonce = "Q18") => ({ data: { snapshot_id: "S", editor_at: "t", original_score: 12, questions: [
  { uid: "u18", cle: "502-18", frozen: Q, current: { ...Q, enonce, choix: ch(key) }, matches: 1, submitted: ["A"] }] } });

describe("BilanCorrigeActuel (transport simulé)", () => {
  it("modification admin pendant la session : vérification attend la nouvelle clé", async () => {
    let key = ["A", "C"]; const lecteur = vi.fn(async () => payload(key));
    render(<BilanCorrigeActuel snapshotId="S" lecteur={lecteur} intervalle={1e9} />);
    await screen.findByText("1 question(s) fausse(s) à refaire.");
    expect(screen.getByTestId("corrige-actuel-notes").textContent).toContain("barème de la copie non prouvé");
    fireEvent.click(screen.getByText("Commencer l’entraînement"));
    await screen.findByText("Vérifier");
    key = ["A"]; // admin corrects back to A while the learner is in the round
    fireEvent.click(screen.getByText("Vérifier"));
    await screen.findByText("0 question(s) fausse(s) à refaire.");
    expect(lecteur).toHaveBeenCalledTimes(3);
  });
  it("réponse périmée ignorée : la lecture la plus récente gagne", async () => {
    let resolveOld: (v: any) => void = () => {}; let n = 0;
    const lecteur = vi.fn(() => ++n === 1 ? new Promise<any>(r => { resolveOld = r; }) : Promise.resolve(payload(["A"])));
    render(<BilanCorrigeActuel snapshotId="S" lecteur={lecteur} intervalle={1e9} />);
    act(() => { window.dispatchEvent(new Event("focus")); });
    await screen.findByText("0 question(s) fausse(s) à refaire.");
    await act(async () => { resolveOld(payload(["B"])); });
    expect(screen.getByText("0 question(s) fausse(s) à refaire.")).toBeTruthy();
  });
  it("relecture périodique tant que visible, sans rechargement", async () => {
    vi.useFakeTimers(); let key = ["A"]; const lecteur = vi.fn(async () => payload(key));
    render(<BilanCorrigeActuel snapshotId="S" lecteur={lecteur} intervalle={1000} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    key = ["B"]; await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByText("1 question(s) fausse(s) à refaire.")).toBeTruthy());
  });
  it("échec de relecture : dernier corrigé conservé, erreur visible", async () => {
    let fail = false; const lecteur = vi.fn(async () => fail ? { error: { message: "x" } } : payload(["A"]));
    render(<BilanCorrigeActuel snapshotId="S" lecteur={lecteur} intervalle={1e9} />);
    await screen.findByText("0 question(s) fausse(s) à refaire.");
    fail = true; act(() => { window.dispatchEvent(new Event("focus")); });
    await screen.findByText(/dernier corrigé lu conservé/);
    expect(screen.getByText("0 question(s) fausse(s) à refaire.")).toBeTruthy();
  });
  it("admin lecture seule : notes visibles, aucun entraînement", async () => {
    render(<BilanCorrigeActuel snapshotId="S" lectureSeule lecteur={async () => payload(["A"])} intervalle={1e9} />);
    await screen.findByTestId("corrige-actuel-notes");
    expect(screen.queryByText("Commencer l’entraînement")).toBeNull();
  });
});
