import { describe, expect, it } from "vitest";
import { CONSENTEMENTS_INTERVENANT, CONTRAT_VERSION, IDENTITES_CONTRAT, SATISFACTION_NOTES, SATISFACTION_TEXTES, operationIdValide, texteContratFige, texteSatisfactionFige, validerReponsesSatisfaction } from "../lib/parcoursIntervenant";

const texte = JSON.stringify(texteContratFige());
const reponsesSatisfaction = () => ({
  ...Object.fromEntries(SATISFACTION_NOTES.map(q => [q.id, 4])),
  ...Object.fromEntries(SATISFACTION_TEXTES.map(q => [q.id, q.id === "commentaire_libre" ? "" : "Réponse fictive"])),
});
describe("Parcours Albert AKONO — trois documents confirmés", () => {
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
  it("distingue trois consentements et confirme l'enquête I30", () => {
    expect(new Set(Object.values(CONSENTEMENTS_INTERVENANT)).size).toBe(3);
    expect(texteSatisfactionFige().titre).toContain("ENQUÊTE DE SATISFACTION FORMATEUR");
    expect(texteSatisfactionFige().introduction).toContain("ni une validation automatique de l'indicateur Qualiopi 30");
  });
  it("exige cinq notes entières de 1 à 5 et les deux réponses utiles", () => {
    expect(SATISFACTION_NOTES).toHaveLength(5);
    expect(validerReponsesSatisfaction(reponsesSatisfaction(), true)).toBeNull();
    const sansCommentaire = reponsesSatisfaction(); delete (sansCommentaire as any).commentaire_libre;
    expect(validerReponsesSatisfaction(sansCommentaire, true)).toBeNull();
    const sansNote = reponsesSatisfaction(); delete (sansNote as any).organisation;
    expect(validerReponsesSatisfaction(sansNote, true)).toContain("Note de 1 à 5 requise");
    expect(validerReponsesSatisfaction({ ...reponsesSatisfaction(), clarte_consignes: 0 }, true)).toContain("Note de 1 à 5 requise");
    expect(validerReponsesSatisfaction({ ...reponsesSatisfaction(), ameliorations: " " }, true)).toContain("Champ à renseigner");
    expect(validerReponsesSatisfaction(reponsesSatisfaction(), false)).toBe("Confirmation de sincérité obligatoire");
  });
  it("sépare l'aperçu du contenu validé pour signature et réponse", () => {
    expect(texteContratFige().etat).toBe("projet_a_valider"); expect(texteContratFige("valide_pour_signature").etat).toBe("valide_pour_signature"); expect(CONTRAT_VERSION).toBe("services-pro-contrat-cadre-intervenant-2026-11-24-v1");
    expect(texteSatisfactionFige().etat).toBe("projet_a_valider"); expect(texteSatisfactionFige("valide_pour_reponse").etat).toBe("valide_pour_reponse");
  });
  it("exige un identifiant UUID d'opération", () => {
    expect(operationIdValide("33333333-3333-4333-8333-333333333333")).toBe(true); expect(operationIdValide("signature-1")).toBe(false);
  });
});
