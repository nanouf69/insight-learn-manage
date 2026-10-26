import { describe, it, expect } from "vitest";
import { rechercherTransaction } from "@/lib/comptabilite/rechercheTransaction";

const justifs = new Map([
  ["j1", { id: "j1", nom_fichier: "ticket_0412.jpg", fournisseur: "Boulangerie Martin", description: "Café croissant" }],
  ["j2", { id: "j2", nom_fichier: "facture.pdf", texte_extrait: "TOTAL TTC 348,00 Garage Dupont" }],
]);

describe("recherche transactions + justificatif", () => {
  it("recherche existante sur le libellé (corep) inchangée", () => {
    expect(rechercherTransaction({ libelle: "PRLV COREP LYON", justificatif_id: null }, justifs, "corep"))
      .toEqual({ trouve: true, source: "transaction" });
  });
  it("trouve un commerçant présent uniquement dans le justificatif", () => {
    const r = rechercherTransaction({ libelle: "CB 1234", justificatif_id: "j1" }, justifs, "martin");
    expect(r).toMatchObject({ trouve: true, source: "justificatif", champ: "fournisseur" });
  });
  it("trouve un texte du ticket, sans tenir compte des accents", () => {
    const r = rechercherTransaction({ libelle: "CB 9", justificatif_id: "j2" }, justifs, "dupont");
    expect(r).toMatchObject({ source: "justificatif", champ: "texte du ticket" });
    expect(rechercherTransaction({ libelle: "CB 1", justificatif_id: "j1" }, justifs, "cafe")).toMatchObject({ source: "justificatif" });
  });
  it("ne prend jamais le justificatif d'une autre transaction", () => {
    expect(rechercherTransaction({ libelle: "CB 9", justificatif_id: "j2" }, justifs, "martin")).toEqual({ trouve: false });
  });
  it("sans justificatif : pas de résultat", () => {
    expect(rechercherTransaction({ libelle: "CB 9", justificatif_id: null }, justifs, "martin")).toEqual({ trouve: false });
    expect(rechercherTransaction({ libelle: "CB 9", justificatif_id: "absent" }, justifs, "martin")).toEqual({ trouve: false });
  });
});
