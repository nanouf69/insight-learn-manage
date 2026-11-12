import { describe, it, expect } from "vitest";
import { STATUT_LOCATION_NON_AUTORISEE, assuranceDepuisPolice, blocagesPolice, lignesAnnexePolice, perimetreVide, policePourVehicule } from "./assurancesVehicules";
import { manquantsAssurance } from "./contratLocationClauses";

describe("police AXA par véhicule", () => {
  it("KIA HK-870-BF : police trouvée, Sharan FL-511-KH : jamais réutilisée", () => {
    expect(policePourVehicule("hk 870 bf")?.numeroPolice).toBe("10832847704");
    expect(policePourVehicule("FL-511-KH")).toBeNull();
    expect(blocagesPolice(null, perimetreVide())[0]).toMatch(/ne peut pas être réutilisée/);
  });
  it("franchises dictées reprises, usage location jamais présumé", () => {
    const a = assuranceDepuisPolice(policePourVehicule("HK-870-BF")!);
    expect(a.franchises).toEqual({ dommages: "700 €", vol: "700 €", incendie: "700 €", brisDeGlace: "100 €" });
    expect(a.locationPayanteAutorisee).toBeNull(); expect(a.usageFormationExamenAutorise).toBeNull();
    expect(a.exclusions).toBe("");
    const m = manquantsAssurance(a, "2026-11-20");
    expect(m).toContain("Autorisation explicite de la location payante par l'assureur");
    expect(m).toContain("Exclusions de garantie");
  });
  it("sans confirmation écrite AXA : location non autorisée ; documents CG manquants signalés", () => {
    const p = policePourVehicule("HK-870-BF")!;
    const b = blocagesPolice(p, perimetreVide());
    expect(b).toContain(STATUT_LOCATION_NON_AUTORISEE);
    expect(b.some(x => x.includes("460.002I"))).toBe(true);
    const ok = blocagesPolice(p, { ...perimetreVide(), confirmationAssureurRecue: true, referenceConfirmation: "Mail AXA fictif", avecMoniteur: false, formation: true, usageProfessionnel: true, locationPayante: true });
    expect(ok).not.toContain(STATUT_LOCATION_NON_AUTORISEE);
    expect(ok.some(x => x.includes("PDF originaux"))).toBe(true); // reste bloqué tant que PDF non annexés
  });
  it("annexe : remorquage/véhicule de remplacement/pertes financières NON souscrits ; caution ≠ franchise", () => {
    const t = lignesAnnexePolice(policePourVehicule("HK-870-BF")!).join(" ");
    expect(t).toMatch(/Remorquage : NON souscrite/); expect(t).toMatch(/Véhicule de remplacement : NON souscrite/);
    expect(t).toMatch(/Pertes financières : NON souscrite/);
    expect(t).toMatch(/aucune franchise n'est facturée automatiquement/);
    expect(t).toMatch(/ne sont pas présumées applicables à une location/);
  });
});
