import { describe, expect, it } from "vitest";
import { CONSENTEMENTS_INTERVENANT, CONTRAT_VERSION, IDENTITES_CONTRAT, MESSAGE_TROISIEME_DOCUMENT, operationIdValide, texteContratFige } from "../lib/parcoursIntervenant";

const texte = JSON.stringify(texteContratFige());
describe("Projet de contrat Albert AKONO — règles confirmées", () => {
  it("fige les deux identités juridiques exactes", () => {
    expect(IDENTITES_CONTRAT.centre).toEqual({ raison_sociale: "SERVICES PRO", forme: "SAS", siret: "82346156100016", adresse: "86 route de Genas, 69003 Lyon", representant: "Naoufal GUENICHI, Président" });
    expect(IDENTITES_CONTRAT.intervenant).toMatchObject({ denomination: "Albert AKONO (DJIOFACK)", forme: "Entrepreneur individuel", siret: "83881665000017", adresse: "27 rue Joseph Brenier, 38200 Vienne", specialite: "Anglais" });
  });
  it("applique 50 euros TTC par heure sans heures historiques attestées", () => {
    expect(IDENTITES_CONTRAT.intervenant.tarif_ttc_horaire).toBe(50);
    expect(texte).toContain("50 euros TTC par heure de mission réellement réalisée");
    expect(texteContratFige().heures_historiques_attestees).toBe(false);
  });
  it("conserve les missions libres, sans minimum ni exclusivité", () => {
    expect(texte).toContain("libre de l'accepter ou de la refuser");
    expect(texte).toContain("Aucun volume minimal de missions");
    expect(texte).toContain("aucune exclusivité");
  });
  it("prévoit une durée indéterminée et un préavis de trente jours", () => {
    expect(texte).toContain("durée indéterminée"); expect(texte).toContain("préavis écrit de trente jours");
  });
  it("impose la confirmation de 2021 sans antidater", () => {
    expect(texteContratFige().debut_collaboration).toEqual({ declare_par_centre: "courant 2021", confirmation_intervenant_requise: true });
    expect(CONSENTEMENTS_INTERVENANT.contrat).toContain("courant 2021"); expect(CONSENTEMENTS_INTERVENANT.contrat).toContain("sans antidatation");
  });
  it("distingue les deux consentements et n'invente pas de troisième document", () => {
    expect(CONSENTEMENTS_INTERVENANT.competences).not.toBe(CONSENTEMENTS_INTERVENANT.contrat);
    expect(MESSAGE_TROISIEME_DOCUMENT).toContain("non généré"); expect(MESSAGE_TROISIEME_DOCUMENT).toContain("intitulé exact");
  });
  it("sépare l'aperçu du contenu validé pour signature", () => {
    expect(texteContratFige().etat).toBe("projet_a_valider"); expect(texteContratFige("valide_pour_signature").etat).toBe("valide_pour_signature"); expect(CONTRAT_VERSION).toBe("services-pro-contrat-cadre-intervenant-2026-11-24-v1");
  });
  it("exige un identifiant UUID d'opération", () => {
    expect(operationIdValide("33333333-3333-4333-8333-333333333333")).toBe(true); expect(operationIdValide("signature-1")).toBe(false);
  });
});
