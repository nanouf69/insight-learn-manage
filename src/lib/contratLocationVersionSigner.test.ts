import { describe, it, expect } from "vitest";
import { blocagesVersionASigner } from "./contratLocationClauses";
import { POLICES, assuranceDepuisPolice, blocagesPoliceVersionASigner, lignesAnnexePolice, perimetreVide, statutAssuranceLocation } from "./assurancesVehicules";

const kia = POLICES[0];
const assurance = { ...assuranceDepuisPolice(kia), exclusions: "Selon CG AXA 460.002I", demarchesDelais: "Déclaration sous 48 h (vol) / 5 jours" };
const base = {
  locataire: { nomComplet: "Mamadou SOW", email: "m@ex.fr", telephone: "0600000000", adresse: "1 rue X Lyon", numPermis: "123", dateDelivrancePermis: "2020-01-01", prefecturePermis: "Rhône" },
  vehiculeChoisi: true, immatriculation: "HK-870-BF", dateDebut: "2026-11-13", dateFin: "2026-11-14",
  prixLocation: "120", tarifJournalier: "60", regime: "consommateur" as const, assurance,
};
const perimOral = { ...perimetreVide(), accordOralDeclare: true, dateAccordOral: "2026-11-12", avecMoniteur: false, formation: true, usageProfessionnel: false, locationPayante: true };

describe("version à signer", () => {
  it("franchises AXA KIA : dommages/vol/incendie 700 €, bris de glace 100 €, période 01/05/2026–30/04/2027", () => {
    expect(assurance.franchises).toEqual({ dommages: "700 €", vol: "700 €", incendie: "700 €", brisDeGlace: "100 €" });
    expect([assurance.validiteDebut, assurance.validiteFin]).toEqual(["2026-05-01", "2027-04-30"]);
  });
  it("champs complets + accord oral daté = prêt à signer", () => {
    expect([...blocagesPoliceVersionASigner(kia, perimOral), ...blocagesVersionASigner(base)]).toEqual([]);
  });
  it("permis vide bloque", () => {
    expect(blocagesVersionASigner({ ...base, locataire: { ...base.locataire, numPermis: "" } })).toContain("Permis B (numéro, date, autorité de délivrance)");
  });
  it("sans accord (ni écrit ni oral daté) bloque", () => {
    expect(blocagesPoliceVersionASigner(kia, { ...perimOral, accordOralDeclare: false }).length).toBe(1);
    expect(blocagesPoliceVersionASigner(kia, { ...perimOral, dateAccordOral: "" }).length).toBe(1);
  });
  it("l'accord oral n'est jamais présenté comme écrit", () => {
    const s = statutAssuranceLocation(perimOral);
    expect(s.niveau).toBe("oral");
    expect(s.texte).toContain("ORAL");
    expect(s.texte).toContain("Aucune confirmation écrite");
    expect(lignesAnnexePolice(kia, perimOral).join(" ")).not.toMatch(/Usage location confirmé par écrit/);
  });
});
