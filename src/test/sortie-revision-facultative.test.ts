import { describe, it, expect } from "vitest";
import { reponsesInitialesPourSortie, sortieRevisionAutorisee } from "@/lib/sortieRevisionFacultative";

const sansPreuve = { initialSoumisServeur: false, passageFigeServeur: false };

describe("sortie facultative de la correction des fausses", () => {
  it("une ligne de révision orpheline ne fait pas apparaître le bouton", () => {
    expect(sortieRevisionAutorisee(sansPreuve, true)).toBe(false);
  });
  it("bouton seulement en révision avec preuve serveur (submitted ou passage figé)", () => {
    expect(sortieRevisionAutorisee({ ...sansPreuve, initialSoumisServeur: true }, false)).toBe(false);
    expect(sortieRevisionAutorisee({ ...sansPreuve, initialSoumisServeur: true }, true)).toBe(true);
    expect(sortieRevisionAutorisee({ ...sansPreuve, passageFigeServeur: true }, true)).toBe(true);
  });
  it("status=submitted restaure les réponses initiales, fausses comprises", () => {
    const r = reponsesInitialesPourSortie(7, { ok: true, row: { status: "submitted", reponses: { "7-1": "B", "7-2": ["A"], "8-1": "C" } } }, null);
    expect(r).toEqual({ "7-1": "B", "7-2": ["A"] });
  });
  it("status in_progress → null même avec un cache ou un snapshot", () => {
    expect(reponsesInitialesPourSortie(7, { ok: true, row: { status: "in_progress", reponses: { "7-1": "A" } } }, { "7-1": "D" })).toBeNull();
  });
  it("absence de ligne → null, sauf passage figé confirmé par le serveur", () => {
    expect(reponsesInitialesPourSortie(7, { ok: true, row: null }, { "7-1": "D" })).toBeNull();
    expect(reponsesInitialesPourSortie(7, { ok: true, row: null }, null, { "7-1": "C" })).toEqual({ "7-1": "C" });
  });
  it("relecture en échec : seul le cache submitted confirmé est utilisé, sinon null (jamais 0)", () => {
    expect(reponsesInitialesPourSortie(7, { ok: false }, { "7-1": "B" })).toEqual({ "7-1": "B" });
    expect(reponsesInitialesPourSortie(7, { ok: false }, null)).toBeNull();
    expect(reponsesInitialesPourSortie(7, { ok: true, row: { status: "submitted", reponses: {} } }, null)).toBeNull();
  });
});
