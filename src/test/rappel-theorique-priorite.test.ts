// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  preparerRappelTheorique, progressionNonPratique, projeterPrioritePratique, relireEtPreparerRappel,
  type DossierRappel, type ObligationCanonique, type HistoriqueRappel,
} from "../../supabase/functions/_shared/rappelTheoriquePriorite";

const obligation = (id: number, terminee = false, pratique = false): ObligationCanonique =>
  ({ id, terminee, pratique, obligatoire: true, dispense: false });
const dossier = (): DossierRappel => ({
  id: "eleve-1", filiere: "vtc", accesActif: true, exclu: false, obligations: [obligation(2), obligation(8, false, true)],
  dejaConnecte: true, incidentTechnique: false,
  financementVerifie: { cpf: false, engagementsFranceTravail: false },
  passage: { id: "passage-1", dossierId: "eleve-1", dateReelle: "2026-11-17", source: "cma_verifie", statut: "present" },
});
function decide(d = dossier(), instant = "2026-11-18T09:00:00Z", historique: HistoriqueRappel[] | null = []) {
  return preparerRappelTheorique({ dossier: d, maintenant: new Date(instant), premiereDateExamenEligible: "2026-11-17", historique });
}
describe("Rappels théorie isolés, sans transport", () => {
  it("J−7 utilise seulement la date prévue confirmée", () => {
    const d = { ...dossier(), passage: null, examenPrevu: { id: "prevu-1", dossierId: "eleve-1", datePrevue: "2026-11-17", statut: "confirme" as const } };
    expect(decide(d, "2026-11-10T09:00:00Z")).toMatchObject({ etat: "preparer", phase: "avant", rang: 0, modele: { type: "ferme" }, activationAutorisee: false });
  });
  for (const jour of [9, 11]) it(`aucun rattrapage J−7 au jour ${jour}`, () => {
    const d = { ...dossier(), passage: null, examenPrevu: { id: "prevu-1", dossierId: "eleve-1", datePrevue: "2026-11-17", statut: "confirme" as const } };
    expect(decide(d, `2026-11-${String(jour).padStart(2, "0")}T09:00:00Z`).etat).toBe("attendre");
  });
  for (const statut of ["annule", "reporte"] as const) it(`J−7 ${statut} exclu`, () => {
    const d = { ...dossier(), passage: null, examenPrevu: { id: "prevu-1", dossierId: "eleve-1", datePrevue: "2026-11-17", statut } };
    expect(decide(d, "2026-11-10T09:00:00Z").etat).toBe("arreter");
  });
  it("report confirmé crée nouvelle échéance J−7 sans reprendre l'ancienne", () => {
    const d = { ...dossier(), passage: null, examenPrevu: { id: "prevu-2", dossierId: "eleve-1", datePrevue: "2026-11-24", statut: "confirme" as const } };
    expect(decide(d, "2026-11-10T09:00:00Z").etat).toBe("attendre");
    expect(decide(d, "2026-11-17T09:00:00Z")).toMatchObject({ etat: "preparer", phase: "avant" });
  });
  it("J−7 est aussi supprimé si tous les modules hors pratique sont complets", () => {
    const d = { ...dossier(), passage: null, obligations: [obligation(2, true), obligation(8, false, true)], examenPrevu: { id: "prevu-1", dossierId: "eleve-1", datePrevue: "2026-11-17", statut: "confirme" as const } };
    expect(decide(d, "2026-11-10T09:00:00Z").etat).toBe("arreter");
  });
  for (const [jour, type] of [[18, "ferme"], [20, "ferme"], [22, "ferme"], [24, "obligations"], [26, "obligations"], [28, "obligations"]] as const) {
    it(`J+${jour - 17} modèle ${type}`, () => expect(decide(dossier(), `2026-11-${jour}T09:00:00Z`)).toMatchObject({ etat: "preparer", phase: "apres", modele: { type }, activationAutorisee: false }));
  }
  it("après examen, la date réelle prime sur une date prévue différente", () => {
    expect(decide({ ...dossier(), examenPrevu: { id: "prevu", dossierId: "eleve-1", datePrevue: "2026-11-19", statut: "confirme" } })).toMatchObject({ etat: "preparer", rang: 1, phase: "apres" });
  });
  for (const jour of [24, 26, 28]) it(`J+${jour - 17} campagne distincte, aucune expédition autorisée`, () => {
    const resultat = decide(dossier(), `2026-11-${jour}T09:00:00Z`);
    if (resultat.etat !== "preparer") throw new Error("fixture");
    expect(resultat.modele.campagneId).toBe("rappel_modules_connectes_theorique");
    expect(resultat.activationAutorisee).toBe(false);
  });
  it("une horloge invalide est un incident, jamais une émission", () => expect(decide(dossier(), "invalid").etat).toBe("a_verifier"));
  it("le modèle ferme n'introduit aucun prérequis pratique", () => {
    const resultat = decide();
    if (resultat.etat !== "preparer") throw new Error("fixture");
    expect(resultat.modele.exigeValidationReglePratique).toBe(false);
    expect(resultat.activationAutorisee).toBe(false);
    expect(resultat.pointsAValider.length).toBe(3);
  });
  it("les jamais connectés restent exclusivement dans le circuit historique", () => expect(decide({ ...dossier(), dejaConnecte: false }).etat).toBe("arreter"));
  it("connexion inconnue ne devient pas connexion prouvée", () => expect(decide({ ...dossier(), dejaConnecte: null }).etat).toBe("a_verifier"));
  it("incident technique exclut l'envoi", () => expect(decide({ ...dossier(), incidentTechnique: true }).etat).toBe("a_verifier"));
  it("état des incidents inconnu exclut l'envoi", () => expect(decide({ ...dossier(), incidentTechnique: null }).etat).toBe("a_verifier"));
  for (const filiere of ["vtc", "taxi"] as const) it(`${filiere} : premier rappel J+1`, () => {
    expect(decide({ ...dossier(), filiere })).toMatchObject({ etat: "preparer", jourEcheance: "2026-11-18", rang: 1 });
  });
  for (const [jour, etat, rang] of [[17, "attendre", undefined], [19, "attendre", undefined], [20, "preparer", 2], [22, "preparer", 3]] as const) {
    it(`cadence 17 novembre → jour ${jour}`, () => {
      const resultat = decide(dossier(), `2026-11-${jour}T09:00:00Z`);
      expect(resultat.etat).toBe(etat);
      if (resultat.etat === "preparer") expect(resultat.rang).toBe(rang);
    });
  }
  it("Paris : J+1 peut commencer la veille en UTC", () => {
    expect(decide(dossier(), "2026-11-17T23:30:00Z")).toMatchObject({ etat: "preparer", jourEcheance: "2026-11-18" });
  });
  for (const [examen, instant, attendu] of [
    ["2027-01-31", "2027-01-31T23:30:00Z", "2027-02-01"],
    ["2026-12-31", "2026-12-31T23:30:00Z", "2027-01-01"],
    ["2027-03-27", "2027-03-28T08:00:00Z", "2027-03-28"],
    ["2027-10-30", "2027-10-31T09:00:00Z", "2027-10-31"],
  ]) it(`J+1 calendaire ${examen}`, () => {
    const d = dossier();
    if (!d.passage) throw new Error("fixture");
    d.passage.dateReelle = examen;
    expect(decide(d, instant)).toMatchObject({ etat: "preparer", jourEcheance: attendu, rang: 1 });
  });
  it("aucun mail si tout terminé, même pratique incomplète", () => {
    expect(decide({ ...dossier(), obligations: [obligation(2, true), obligation(8, false, true)] }).etat).toBe("arreter");
  });
  it("exclut facultatifs et dispenses", () => {
    expect(progressionNonPratique([obligation(2, true), { ...obligation(3), obligatoire: false }, { ...obligation(10), dispense: true }]))
      .toEqual({ etat: "ok", total: 1, restants: [], complete: true });
  });
  it("aucune obligation non pratique n'autorise un rappel", () => expect(decide({ ...dossier(), obligations: [] }).etat).toBe("arreter"));
  it("lecture indisponible ne devient pas incomplet", () => expect(decide({ ...dossier(), obligations: null }).etat).toBe("a_verifier"));
  it("statut canonique inconnu reste à vérifier", () => expect(decide({ ...dossier(), obligations: [{ ...obligation(2), terminee: null }] }).etat).toBe("a_verifier"));
  it("dédoublonne les obligations sans les modifier", () => expect(progressionNonPratique([obligation(2), obligation(2)]))
    .toEqual({ etat: "ok", total: 1, restants: [2], complete: false }));
  it("projection contradictoire refuse toute conclusion", () => expect(progressionNonPratique([obligation(2), obligation(2, true)])).toEqual({ etat: "inconnu" }));
  for (const statut of ["absent", "reporte", "annule"] as const) it(`pas de mail ${statut}`, () => {
    const d = dossier(); if (!d.passage) throw new Error("fixture"); d.passage.statut = statut;
    expect(decide(d).etat).toBe("arreter");
  });
  it("planning CMA n'est pas preuve de passage", () => {
    const d = dossier(); if (!d.passage) throw new Error("fixture"); d.passage.source = "planning";
    expect(decide(d).etat).toBe("a_verifier");
  });
  it("preuve d'un autre élève refusée", () => {
    const d = dossier(); if (!d.passage) throw new Error("fixture"); d.passage.dossierId = "autre";
    expect(decide(d).etat).toBe("a_verifier");
  });
  it("pas de rattrapage ancien", () => {
    const d = dossier(); if (!d.passage) throw new Error("fixture"); d.passage.dateReelle = "2026-11-15";
    expect(decide(d).etat).toBe("arreter");
  });
  it("date impossible refusée", () => {
    const d = dossier(); if (!d.passage) throw new Error("fixture"); d.passage.dateReelle = "2026-02-30";
    expect(decide(d).etat).toBe("a_verifier");
  });
  for (const changement of [{ exclu: true }, { accesActif: false }, { filiere: "hors_perimetre" as const }]) {
    it(`exclusion ${JSON.stringify(changement)}`, () => expect(decide({ ...dossier(), ...changement }).etat).toBe("arreter"));
  }
  for (const etat of ["reserve", "indetermine", "rejete"] as const) it(`envoi ${etat} : pas de relance aveugle`, () => {
    expect(decide(dossier(), "2026-11-20T09:00:00Z", [{ dossierId: "eleve-1", passageId: "passage-1", jourEcheance: "2026-11-18", etat }]).etat).toBe("a_verifier");
  });
  it("échéance acceptée ne se répète pas", () => expect(decide(dossier(), undefined, [{ dossierId: "eleve-1", passageId: "passage-1", jourEcheance: "2026-11-18", etat: "accepte" }]).etat).toBe("attendre"));
  it("journal d'un autre dossier ne supprime pas le rappel", () => expect(decide(dossier(), undefined, [{ dossierId: "autre", passageId: "passage-1", jourEcheance: "2026-11-18", etat: "accepte" }]).etat).toBe("preparer"));
  it("double préparation produit la même clé pour le futur verrou atomique", () => expect(decide()).toEqual(decide()));
  it("journal illisible empêche la préparation", () => expect(decide(dossier(), undefined, null).etat).toBe("a_verifier"));
  it("relit avant chaque préparation et arrête immédiatement dès complétion", async () => {
    let lectures = 0;
    const lire = async () => {
      lectures++;
      return { dossier: { ...dossier(), obligations: [obligation(2, lectures > 1)] }, maintenant: new Date("2026-11-18T09:00:00Z"), premiereDateExamenEligible: "2026-11-17", historique: [] };
    };
    expect((await relireEtPreparerRappel(lire)).etat).toBe("preparer");
    expect((await relireEtPreparerRappel(lire)).etat).toBe("arreter");
    expect(lectures).toBe(2);
  });
  it("panne réseau ne prépare aucun mail", async () => expect((await relireEtPreparerRappel(async () => { throw new Error("offline"); })).etat).toBe("a_verifier"));
});
describe("Priorité indicative, jamais réservation bloquée", () => {
  it("complets d'abord, incomplets conservés et réservations inchangées", () => {
    const candidats = [
      { dossierId: "incomplet", ordreContractuel: 1, reservationExistante: false, obligations: [obligation(2)], exceptionAdminVerifiee: false },
      { dossierId: "complet", ordreContractuel: 2, reservationExistante: false, obligations: [obligation(2, true), obligation(8, false, true)], exceptionAdminVerifiee: false },
      { dossierId: "reserve", ordreContractuel: 3, reservationExistante: true, obligations: [obligation(2)], exceptionAdminVerifiee: false },
    ];
    const avant = structuredClone(candidats);
    const resultat = projeterPrioritePratique(candidats);
    expect(resultat.map(c => c.dossierId)).toEqual(["reserve", "complet", "incomplet"]);
    expect(resultat[2].priorite).toBe("non_prioritaire");
    expect(candidats).toEqual(avant);
  });
  it("exception admin ne fabrique pas de validation", () => {
    const obligations = [obligation(2)];
    expect(projeterPrioritePratique([{ dossierId: "bug", ordreContractuel: 1, reservationExistante: false, obligations, exceptionAdminVerifiee: true }])[0].priorite).toBe("prioritaire");
    expect(obligations[0].terminee).toBe(false);
  });
  it("ordre contractuel stable entre deux prioritaires", () => {
    const base = { reservationExistante: false, obligations: [obligation(2, true)], exceptionAdminVerifiee: false };
    expect(projeterPrioritePratique([{ ...base, dossierId: "b", ordreContractuel: 2 }, { ...base, dossierId: "a", ordreContractuel: 1 }]).map(c => c.dossierId)).toEqual(["a", "b"]);
  });
});