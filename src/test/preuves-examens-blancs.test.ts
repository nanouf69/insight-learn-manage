import { describe, it, expect } from "vitest";
import { evaluerEpreuve, matiereDe, moduleEBPourFiliere } from "@/lib/preuvesExamensBlancs";

const M = ["anglais", "francais", "gestion", "reglementation_vtc", "reglementation_vtc2", "securite", "t3p"];
const rep = (ex: string, status: string, n: number, extra = "") =>
  M.map((m) => ({ exercice_id: `${ex}__${m}${extra}`, status, reponses: Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i), "A"])), submitted_at: status === "submitted" ? "2026-05-25" : null }));
const notes = (ex: string) => M.map((m) => ({ quiz_id: ex, matiere_id: m }));

describe("preuves examens blancs (données fictives)", () => {
  it("notes historiques 7/7 = preuve même si état courant in_progress (cas EB1)", () => {
    const e = evaluerEpreuve("EB1", 7, rep("EB1", "in_progress", 5), notes("EB1"), []);
    expect(e.prouvee).toBe(true); expect(e.etat).toBe("notee");
  });
  it("soumise sans note = correction manquante, pas inachevée (cas EB3)", () => {
    const e = evaluerEpreuve("EB3", 7, rep("EB3", "submitted", 5), [], []);
    expect(e.prouvee).toBe(true); expect(e.etat).toBe("soumise_correction_manquante");
  });
  it("matières envoyées vides = envoi incomplet (cas EB4)", () => {
    const r = rep("EB4", "submitted", 5);
    r[2].reponses = {}; r[4].reponses = {};
    const e = evaluerEpreuve("EB4", 7, r, [], []);
    expect(e.prouvee).toBe(false); expect(e.etat).toBe("soumission_incomplete");
    expect(e.soumisesVides).toEqual(["gestion", "reglementation_vtc2"]);
  });
  it("tout rempli mais non envoyé = en cours (cas EB5)", () => {
    expect(evaluerEpreuve("EB5", 7, rep("EB5", "in_progress", 5), [], []).etat).toBe("en_cours");
  });
  it("partiellement envoyé = « Partiellement soumise », non prouvé (cas EB6)", () => {
    const r = rep("EB6", "in_progress", 5); r[2].status = "submitted"; r[5].status = "submitted";
    const e = evaluerEpreuve("EB6", 7, r, [], []);
    expect(e.prouvee).toBe(false); expect(e.etat).toBe("partiellement_soumise");
  });
  it("passage V2 terminé = preuve ; test exclu", () => {
    expect(evaluerEpreuve("EB2", 7, [], [], [{ exam_id: "EB2", etat: "terminee" }]).prouvee).toBe(true);
    expect(evaluerEpreuve("EB2", 7, [], [], [{ exam_id: "EB2", etat: "terminee", is_test: true }]).prouvee).toBe(false);
  });
  it("nouvelle tentative __t2 en cours coexiste avec tentative 1 soumise", () => {
    const e = evaluerEpreuve("EB3", 7, [...rep("EB3", "submitted", 5), ...rep("EB3", "in_progress", 1, "__t2")], [], []);
    expect(e.prouvee).toBe(true);
  });
  it("aucune donnée = non commencée ; ne confond pas EB1 et EB10", () => {
    expect(evaluerEpreuve("EB1", 7, rep("EB10", "submitted", 5), [], []).etat).toBe("non_commencee");
    expect(matiereDe("EB1__anglais__t2", "EB1")).toBe("anglais");
  });
  it("filière → module EB", () => {
    expect(moduleEBPourFiliere("vtc-e", null)).toBe(35); expect(moduleEBPourFiliere("TAXI-E", null)).toBe(36);
    expect(moduleEBPourFiliere("ta-e", null)).toBe(37); expect(moduleEBPourFiliere("va-e", null)).toBe(38);
    expect(moduleEBPourFiliere(null, "vtc-elearning-1099")).toBe(35); expect(moduleEBPourFiliere("vtc", "vtc")).toBe(null);
  });
});
