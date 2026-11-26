import { describe, it, expect } from "vitest";
import { reponsesInitialesPourSortie, sortieRevisionAutorisee } from "@/lib/sortieRevisionFacultative";

describe("sortie facultative de la correction des fausses", () => {
  it("n'est offerte que pour un quiz initial déjà remis en révision", () => {
    expect(sortieRevisionAutorisee(false, true)).toBe(false);
    expect(sortieRevisionAutorisee(true, false)).toBe(false);
    expect(sortieRevisionAutorisee(true, true)).toBe(true);
  });
  it("réaffiche les réponses de la tentative initiale serveur, réponses fausses comprises", () => {
    const r = reponsesInitialesPourSortie(7, { status: "submitted", reponses: { "7-1": "B", "7-2": ["A"], "8-1": "C" } }, null);
    expect(r).toEqual({ "7-1": "B", "7-2": ["A"] });
  });
  it("ignore une ligne non remise et retombe sur le snapshot initial local", () => {
    const r = reponsesInitialesPourSortie(7, { status: "in_progress", reponses: { "7-1": "" } }, { "7-1": "D" });
    expect(r).toEqual({ "7-1": "D" });
  });
  it("sans preuve, ne fabrique aucun score (null, jamais 0)", () => {
    expect(reponsesInitialesPourSortie(7, null, null)).toBeNull();
    expect(reponsesInitialesPourSortie(7, { status: "submitted", reponses: {} }, null)).toBeNull();
  });
});
