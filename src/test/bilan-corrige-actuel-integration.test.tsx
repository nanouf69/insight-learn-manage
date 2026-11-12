import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { readFileSync } from "fs";
const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: any[]) => rpc(...a) } }));
const flag = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/bilanCorrigeActuel", async (orig) => { const m: any = await orig(); return { ...m, get BILAN_CORRIGE_ACTUEL_ACTIF() { return flag.on; } }; });
import { BilanCorrigeActuel } from "@/components/cours-en-ligne/BilanCorrigeActuel";
import { BilanFutureApercuAdmin } from "@/components/cours-en-ligne/BilanFutureApercuAdmin";

const ch = (k: string[]) => ["x", "y"].map((texte, i) => ({ lettre: "AB"[i], texte, correct: k.includes("AB"[i]) }));
const payload = (id: string, mod: number, key: string[], uid: string | null = "u1") => ({ data: { snapshot_id: id, module_id: mod, editor_at: "t", original_score: 3, questions: [
  { uid, cle: "18", frozen: { uid, type: "QCM", enonce: "Q", choix: ch(["A"]) }, current: uid ? { uid, type: "QCM", enonce: "Q", choix: ch(key) } : null, matches: uid ? 1 : 0, submitted: ["A"] }] }, error: null });
const apercu = { route: "future" as const, matieres: [0,1,2,3,4].map(i => ({ exercise_id: 500 + i, submitted: { correct_count: 7, question_count: 10 }, questions: [{ id: 1, enonce: "Q", choix: ch([]).map(({ lettre, texte }) => ({ lettre, texte })) }] })) };
beforeEach(() => { rpc.mockReset(); flag.on = false; });

describe("intégration corrigé actuel (transport simulé)", () => {
  it("flag OFF : nouveau Bilan et ancien parcours ne montent rien, admin sans appel", () => {
    const f = readFileSync("src/components/cours-en-ligne/BilanFutureExam.tsx", "utf8");
    const m = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
    expect(f).toContain('{BILAN_CORRIGE_ACTUEL_ACTIF && correction && <BilanCorrigeActuel key={passage.receipt.passageId} sourceType="future" snapshotId={passage.receipt.passageId} />}');
    expect(m).toMatch(/BILAN_CORRIGE_ACTUEL_ACTIF && \[5,11\]\.includes\(Number\(module\.id\)\) && !apercuAdmin && etatSnap\.statut === "pret"/);
    render(<BilanFutureApercuAdmin apercu={apercu} presentationVtc />);
    expect(screen.queryByTestId("admin-corrige-actuel-bloque")).toBeNull(); expect(rpc).not.toHaveBeenCalled();
  });
  it("flag ON admin : blocage explicite (pas d'identifiant de copie), zéro appel, note officielle conservée", () => {
    flag.on = true;
    render(<BilanFutureApercuAdmin apercu={apercu} presentationVtc />);
    expect(screen.getByTestId("admin-corrige-actuel-bloque").textContent).toContain("ne fournit pas l'identifiant");
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([["VTC", 5], ["TAXI", 11]])("élève %s A–E : lit l'identifiant remis via le lecteur futur", async (_n, mod) => {
    rpc.mockResolvedValue(payload("R-" + mod, mod, ["B"]));
    render(<BilanCorrigeActuel sourceType="future" snapshotId={"R-" + mod} intervalle={1e9} />);
    await screen.findByText("1 question(s) fausse(s) à refaire.");
    expect(rpc).toHaveBeenCalledWith("bilan_future_corrige_actuel_read", { p_receipt: "R-" + mod });
    expect(rpc.mock.calls.every(c => /_read$/.test(c[0]))).toBe(true);
    expect(screen.getByTestId("corrige-actuel-notes").textContent).toContain("barème de la copie non prouvé");
  });
  it("ancien Bilan : lecteur snapshot, admin lecture seule sans entraînement", async () => {
    rpc.mockResolvedValue(payload("S", 5, ["A"]));
    render(<BilanCorrigeActuel snapshotId="S" lectureSeule intervalle={1e9} />);
    await screen.findByTestId("corrige-actuel-notes");
    expect(rpc).toHaveBeenCalledWith("bilan_corrige_actuel_read", { p_snapshot: "S" });
    expect(screen.queryByText("Commencer l’entraînement")).toBeNull();
  });
  it("lien manquant : question non rapprochée, note indisponible, jamais 0", async () => {
    rpc.mockResolvedValue(payload("R", 5, ["A"], null));
    render(<BilanCorrigeActuel sourceType="future" snapshotId="R" intervalle={1e9} />);
    await screen.findByText(/1 question\(s\) non rapprochée/);
    expect(screen.getByTestId("corrige-actuel-notes").textContent).toContain("indisponible (questions non rapprochées)");
  });
  it("onglet ouvert : changement de clé puis erreur de relecture", async () => {
    rpc.mockResolvedValue(payload("R", 11, ["A"]));
    render(<BilanCorrigeActuel sourceType="future" snapshotId="R" intervalle={1e9} />);
    await screen.findByText("0 question(s) fausse(s) à refaire.");
    rpc.mockResolvedValue(payload("R", 11, ["B"]));
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await screen.findByText("1 question(s) fausse(s) à refaire.");
    rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await screen.findByText(/dernier corrigé lu conservé/);
    expect(screen.getByText("1 question(s) fausse(s) à refaire.")).toBeTruthy();
  });
  it("identifiant d'une autre copie dans la réponse : refusé", async () => {
    rpc.mockResolvedValue(payload("AUTRE", 5, ["A"]));
    render(<BilanCorrigeActuel sourceType="future" snapshotId="R" intervalle={1e9} />);
    await screen.findByText(/Corrigé actuel indisponible/);
  });
});
