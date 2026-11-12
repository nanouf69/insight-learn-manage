// @vitest-environment happy-dom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { readSrTraining, srTrainingWrong } from "@/lib/bilanSrTraining";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { BilanSrTraining } from "@/components/cours-en-ligne/BilanSrTraining";
const data = { source_id: "copy", source_type: "snapshot", editor_at: "2026-11-12T10:30:30Z", unavailable: 0, questions: [
  { uid: "truck", id: 71, enonce: "Sur une route étroite, un camion arrive en face. Dois-je lui céder le passage ?", choix: [{ lettre: "A", texte: "Oui" }, { lettre: "B", texte: "Non" }], correct: ["B"], answer: ["A"] },
  { uid: "alcohol", id: 226, enonce: "Vous avez consommé de l’alcool. A l’issue d’un contrôle routier, votre taux est de 0,29 mg par litre d’air expiré. Que se passe-t-il ?", choix: [{ lettre: "C", texte: "délit" }, { lettre: "D", texte: "contravention et perte de 6 points" }], correct: ["D"], answer: ["D"] },
] };
afterEach(() => { cleanup(); rpc.mockReset(); });
describe("Entraînement VTC, sans historique réécrit", () => {
  it("Q71 ancien Oui devient faux avec Non ; Q226 D seul n'est plus faux", () => {
    const r = readSrTraining(data, "snapshot", "copy"); expect(r).not.toBeNull();
    if (!r) throw new Error("fixture");
    expect(srTrainingWrong(r).map(q => q.uid)).toEqual(["truck"]);
  });
  it("Q226 C+D reste fausse, D seul juste ; dernier choix local prioritaire", () => {
    const r = readSrTraining(data, "snapshot", "copy"); if (!r) throw new Error("fixture");
    expect(srTrainingWrong(r, { alcohol: ["C", "D"] }).map(q => q.uid)).toEqual(["truck", "alcohol"]);
    expect(srTrainingWrong(r, { truck: ["B"], alcohol: ["D"] })).toEqual([]);
    expect(srTrainingWrong(r, { truck: [] }).map(q => q.uid)).toEqual(["truck"]);
  });
  it("remapping du numéro n'affecte pas une identité UID prouvée", () => {
    const remapped = { ...data, questions: data.questions.map(q => ({ ...q, id: q.id + 300 })) };
    const r = readSrTraining(remapped, "snapshot", "copy"); if (!r) throw new Error("fixture");
    expect(srTrainingWrong(r, { truck: ["B"] })).toEqual([]);
  });
  it("refuse autre copie, UID doublonné et clé absente des choix", () => {
    expect(readSrTraining(data, "snapshot", "other")).toBeNull();
    expect(readSrTraining({ ...data, questions: [data.questions[0], data.questions[0]] }, "snapshot", "copy")).toBeNull();
    expect(readSrTraining({ ...data, questions: [{ ...data.questions[0], correct: ["D"] }] }, "snapshot", "copy")).toBeNull();
  });
  it("révision, faux résiduels et retour ne font que lire une fois, sans écriture", async () => {
    const before = JSON.stringify(data);
    rpc.mockResolvedValue({ data, error: null });
    render(<BilanSrTraining sourceType="snapshot" sourceId="copy" />);
    fireEvent.click(screen.getByText("🎯 Refaire les fausses"));
    await screen.findByText("Commencer l’entraînement");
    expect(screen.getByTestId("sr-wrong-count").textContent).toContain("1 question(s) fausse(s)");
    fireEvent.click(screen.getByText("Commencer l’entraînement"));
    const choice = (letter: string) => document.querySelector(`[data-choix="${letter}"]`) as HTMLElement;
    fireEvent.click(choice("A")); fireEvent.click(choice("B"));
    fireEvent.click(screen.getByText("Vérifier l’entraînement"));
    expect(screen.getByTestId("sr-wrong-count").textContent).toContain("0 question(s) fausse(s)");
    fireEvent.click(screen.getByText("Retour à la copie"));
    expect(rpc.mock.calls).toEqual([["bilan_vtc_sr_training_read", { p_type: "snapshot", p_source: "copy" }]]);
    expect(JSON.stringify(data)).toBe(before);
  });
  it("canal absent = suspension, jamais liste vide réussie", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42883" } });
    render(<BilanSrTraining sourceType="future" sourceId="copy" />);
    fireEvent.click(screen.getByText("🎯 Refaire les fausses"));
    expect((await screen.findByRole("alert")).textContent).toContain("entraînement suspendu");
    expect(screen.queryByTestId("sr-wrong-count")).toBeNull();
  });
});