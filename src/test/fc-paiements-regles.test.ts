import { describe, it, expect } from "vitest";
import { classer, empreinte, regrouperDoublons, peutEnvoyerAuto, type DossierFc } from "../../supabase/functions/_shared/fcPaiementsRegles";

const D: DossierFc[] = [
  { id: "a1", nom: "Fictif", prenom: "Karim", email: "karim@test.invalid.fr", type_apprenant: "continue-taxi" },
  { id: "a2", nom: "Homo", prenom: "Ali", email: "ali1@test.fr", type_apprenant: "continue-vtc" },
  { id: "a3", nom: "Homo", prenom: "Ali", email: "ali2@test.fr", type_apprenant: "continue-taxi" },
  { id: "a4", nom: "Sansmail", prenom: "Leo", email: null, type_apprenant: "continue-vtc" },
  { id: "a5", nom: "Initial", prenom: "Marc", email: "m@test.fr", type_apprenant: "vtc" },
];
const tx = (montant: number, libelle: string, id = "t") => ({ id, date_operation: "2026-11-03", montant, libelle });

describe("virements formation continue", () => {
  it.each([50, 150, 200, 350])("%i € avec nom complet → rapproché", (m) => {
    expect(classer(tx(m, "Virement FICTIF KARIM formation continue"), D)).toMatchObject({ statut: "rapproche", apprenantId: "a1" });
  });
  it("49 € → hors périmètre", () => expect(classer(tx(49, "formation continue Fictif Karim"), D).statut).toBe("hors_perimetre"));
  it("virement sans lien FC → ignoré", () => expect(classer(tx(500, "Loyer agence"), D).statut).toBe("hors_perimetre"));
  it("dossier non FC jamais rapproché", () => expect(classer(tx(200, "Initial Marc"), D).statut).toBe("hors_perimetre"));
  it("homonymes → revue manuelle", () => expect(classer(tx(200, "Homo Ali formation continue"), D)).toMatchObject({ statut: "a_revoir", candidats: ["a2", "a3"] }));
  it("nom tronqué → revue manuelle", () => expect(classer(tx(50, "Acompte formation continue Taxi pour Mr FIC"), D)).toMatchObject({ statut: "a_revoir", candidats: [] }));
  it("e-mail manquant → revue manuelle", () => expect(classer(tx(200, "Sansmail Leo"), D).statut).toBe("a_revoir"));
  it("remboursement → jamais d'envoi", () => expect(classer(tx(-200, "Remboursement Fictif Karim"), D).statut).toBe("rembourse"));
  it("même virement importé 3 fois → 1 seul paiement", () => {
    const g = regrouperDoublons([tx(200, "Prenom:Karim Nom: FICTIF", "1"), tx(200, "Prenom:Karim Nom: FICTIF", "2"), tx(200, "prenom karim nom fictif", "3")]);
    expect(g.size).toBe(1);
    expect(empreinte(tx(200, "x"))).not.toBe(empreinte(tx(150, "x")));
  });
  it("virements répétés : déjà servi → pas de 2e envoi", () => {
    expect(peutEnvoyerAuto({ statut: "rapproche", historique: false }, true, false)).toBe(true);
    expect(peutEnvoyerAuto({ statut: "rapproche", historique: false }, true, true)).toBe(false);
  });
  it("désactivé ou historique → aucun envoi", () => {
    expect(peutEnvoyerAuto({ statut: "rapproche", historique: false }, false, false)).toBe(false);
    expect(peutEnvoyerAuto({ statut: "rapproche", historique: true }, true, false)).toBe(false);
    expect(peutEnvoyerAuto({ statut: "a_revoir", historique: false }, true, false)).toBe(false);
  });
});

import { estDossierFc as dansFc, estSessionFc } from "../../supabase/functions/_shared/fcPaiementsRegles";
describe("périmètre FC 05/11", () => {
  it("PA TAXI inscrit à une session de formation continue = FC", () => {
    expect(estSessionFc("Formation Continue TAXI - 19 et 20 novembre 2026")).toBe(true);
    expect(dansFc({ id: "a", nom: "AKSU", prenom: "Harun", email: "x@y.fr", type_apprenant: "PA TAXI", inscrit_session_fc: true } as never)).toBe(true);
  });
  it("PA VTC non inscrit à une session FC = hors périmètre", () => expect(dansFc({ id: "b", nom: "X", prenom: "Y", email: "x@y.fr", type_apprenant: "PA VTC" } as never)).toBe(false));
  it("session examen ≠ FC", () => expect(estSessionFc("Session examen — 27 janvier 2026")).toBe(false));
  it("continue-vtc reste FC", () => expect(dansFc({ id: "c", nom: "X", prenom: "Y", email: "x@y.fr", type_apprenant: "continue-vtc" } as never)).toBe(true));
});
