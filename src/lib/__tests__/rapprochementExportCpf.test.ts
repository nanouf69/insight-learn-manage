import { describe, it, expect } from "vitest";
import { parseExportCpf, rapprocher, type FactureRapprochable } from "../rapprochementExportCpf";

const csv = [
  "NUMERO_DOSSIER;NOM;PRENOM;STATUT_DOSSIER;MONTANT_FORMATION;MONTANT_FACTURABLE;MONTANT_FACTURE",
  "111;DUPONT;Jean;Service fait validé;1499.00;1499.00;",
  "222;MARTIN;Léa;Annulé sans suite;999.00;;",
  "333;DURAND;Paul;Service fait validé;1200.00;1100.00;",
  "444;PETIT;Ana;Service fait validé;999.00;;",
].join("\n");

const f = (id: string, beneficiaire: string, montant: number, extra: Partial<FactureRapprochable> = {}): FactureRapprochable => ({
  id, numero: id, date_emission: "2026-05-01", type_financement: "cpf", montant_ttc: montant,
  client_nom: "CAISSE DES DÉPÔTS", beneficiaire, statut: "en_attente", ...extra,
});

describe("rapprochement export CPF", () => {
  const lignes = parseExportCpf(csv);
  it("vert quand nom + montant facturable concordent", () => {
    expect(rapprocher([f("A", "Jean Dupont", 1499)], lignes).get("A")?.couleur).toBe("vert");
  });
  it("deux factures identiques pour un seul dossier : une seule verte, l'autre doublon rouge", () => {
    const r = rapprocher([f("A", "DUPONT Jean", 1499), f("B", "Jean Dupont", 1499)], lignes);
    expect([r.get("A")?.couleur, r.get("B")?.couleur]).toEqual(["vert", "rouge"]);
    expect(r.get("B")?.motif).toMatch(/Doublon/);
  });
  it("dossier annulé ne prouve pas la facturation", () => {
    expect(rapprocher([f("A", "Léa Martin", 999)], lignes).get("A")?.motif).toMatch(/Annulé sans suite/);
  });
  it("écart de montant rouge, montant formation jamais utilisé", () => {
    const r = rapprocher([f("A", "Paul Durand", 1200)], lignes).get("A");
    expect(r?.couleur).toBe("rouge");
    expect(r?.motif).toMatch(/Écart/);
  });
  it("montant facturable absent : non vérifiable", () => {
    expect(rapprocher([f("A", "Ana Petit", 999)], lignes).get("A")?.motif).toMatch(/non vérifiable/);
  });
  it("autre financement rouge hors périmètre", () => {
    expect(rapprocher([f("A", "Jean Dupont", 1499, { type_financement: "particulier" })], lignes).get("A")?.motif).toMatch(/Hors périmètre/);
  });
  it("hors 2026, achats et avoirs ignorés", () => {
    const r = rapprocher([
      f("A", "Jean Dupont", 1499, { date_emission: "2025-12-31" }),
      f("B", "Jean Dupont", -1499),
      f("C", "Jean Dupont", 1499, { type_financement: "fournisseur" }),
    ], lignes);
    expect(r.size).toBe(0);
  });
});

describe("doublons et brouillons", () => {
  const lignes = parseExportCpf(csv);
  it("même élève et montant hors CPF : les deux rouges doublon, aucune effacée", () => {
    const r = rapprocher([
      f("A", "Younes Languer", 200, { type_financement: "professionnel", cleIdentite: "a:1" }),
      f("B", "Younes Languer", 200, { type_financement: "professionnel", cleIdentite: "a:1" }),
    ], lignes);
    expect(r.get("A")?.motif).toMatch(/^Doublon potentiel avec B/);
    expect(r.get("B")?.motif).toMatch(/^Doublon potentiel avec A/);
  });
  it("brouillon non émis exclu, ne crée pas de doublon", () => {
    const r = rapprocher([
      f("A", "Jean Dupont", 1499, { cleIdentite: "a:2" }),
      f("B", "Jean Dupont", 1499, { cleIdentite: "a:2", statut: "brouillon" }),
    ], lignes);
    expect(r.has("B")).toBe(false);
    expect(r.get("A")?.couleur).toBe("vert");
  });
});

import { estCpf } from "@/lib/rapprochementExportCpf";
describe("estCpf", () => {
  it("client Caisse des Dépôts = CPF même saisi Professionnel", () => {
    expect(estCpf({ type_financement: "professionnel", client_nom: "Caisse des Dépôts et Consignations" })).toBe(true);
    expect(estCpf({ type_financement: "opco", client_nom: "OPCO Mobilités" })).toBe(false);
  });
});
