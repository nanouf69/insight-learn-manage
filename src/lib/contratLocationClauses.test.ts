import { describe, it, expect } from "vitest";
import { A_RENSEIGNER, annexeAssurance, articleDepot, articleDommages, articleLitiges, articleRestitution, articleVol, assuranceVide, blocagesSignature, manquantsAssurance, type AssuranceLocation } from "./contratLocationClauses";

const assuranceComplete = (): AssuranceLocation => ({
  ...assuranceVide(), assureur: "Assureur Fictif", numeroPolice: "POL-FICTIVE", validiteDebut: "2026-01-01", validiteFin: "2026-12-31",
  locationPayanteAutorisee: true, usageFormationExamenAutorise: true, conducteursAutorises: "Locataire désigné", plafondRc: "illimité (corporel)",
  garanties: { dommages: true, vol: true, incendie: false, brisDeGlace: false, assistance: false },
  franchises: { dommages: "800 € (fictif)", vol: "1 000 € (fictif)", incendie: "", brisDeGlace: "" },
  exclusions: "Conduite sans permis (fictif)", demarchesDelais: "5 jours ouvrés (fictif)",
});
const txt = (a: { paragraphes: string[] }) => a.paragraphes.join(" ");
const ctx = (over: any = {}) => ({ avecCaution: true, regime: "consommateur" as const, tarifJournalier: "60", assurance: assuranceComplete(), ...over });

describe("contrat de location v2", () => {
  it("dommages : franchise seulement si prouvée, contradictoire et pas de prélèvement arbitraire", () => {
    expect(txt(articleDommages(ctx()))).toContain("800 € (fictif)");
    const vide = txt(articleDommages(ctx({ assurance: assuranceVide() })));
    expect(vide).toContain(`Franchise dommages déclarée : ${A_RENSEIGNER}`);
    expect(vide).toMatch(/expertise contradictoire/);
    expect(vide).toMatch(/vétusté/);
    expect(vide).toMatch(/Aucun prélèvement/);
  });
  it("vol : plainte, récépissé, clés, pas de présomption de valeur ni garantie fictive", () => {
    const t = txt(articleVol(ctx({ assurance: assuranceVide() })));
    expect(t).toMatch(/récépissé/); expect(t).toMatch(/clés/);
    expect(t).toContain("aucune présomption automatique");
    expect(t).toContain(`Garantie vol souscrite : ${A_RENSEIGNER}`);
  });
  it("non-restitution : mise en demeure, pas de vol automatique à 24 h, plus de forfait 20 €/h", () => {
    const t = txt(articleRestitution(ctx()));
    expect(t).toMatch(/mise en demeure/); expect(t).toContain("Un simple retard ne constitue pas un vol");
    expect(t).toMatch(/voie de fait/); expect(t).toContain("60 € TTC");
    expect(t).not.toMatch(/20 € TTC par heure/);
    expect(txt(articleRestitution(ctx({ tarifJournalier: "" })))).toContain(A_RENSEIGNER);
  });
  it("caution 500 € / sans caution 0 € distincts de la franchise", () => {
    expect(txt(articleDepot(ctx()))).toMatch(/500 €.*n'est ni une franchise/);
    const s = txt(articleDepot(ctx({ avecCaution: false })));
    expect(s).toContain("0 €"); expect(s).toMatch(/ne supprime ni la franchise/);
  });
  it("litiges : consommateur sans clause attributive, professionnel tribunal de commerce", () => {
    const c = txt(articleLitiges(ctx()));
    expect(c).toMatch(/médiateur/); expect(c).toMatch(/R631-3/); expect(c).not.toMatch(/Tribunal judiciaire de Lyon/);
    expect(txt(articleLitiges(ctx({ regime: "professionnel" })))).toMatch(/Tribunal de commerce de Lyon/);
  });
  it("annexe assurance vide : tout à renseigner, aucune garantie précochée, bloquant", () => {
    const a = assuranceVide();
    expect(Object.values(a.garanties).every(g => g === null)).toBe(true);
    expect(txt(annexeAssurance(a))).not.toMatch(/Oui \(attesté/);
    const m = manquantsAssurance(a, "2026-11-20");
    expect(m).toContain("Numéro de police"); expect(m).toContain("Autorisation explicite de la location payante par l'assureur");
    expect(manquantsAssurance(assuranceComplete(), "2026-11-20")).toEqual([]);
    expect(manquantsAssurance(assuranceComplete(), "2027-02-01")).toContain("Police expirant avant la fin de location");
    expect(manquantsAssurance({ ...assuranceComplete(), franchises: { ...assuranceComplete().franchises, vol: "" } }, "2026-11-20")).toContain("Franchise vol par sinistre");
  });
  it("signature : permis vide, régime inconnu et validation juridique bloquent ; aucune signature réutilisée", () => {
    const b = blocagesSignature({
      locataire: { nomComplet: "Mamadou Sow", email: "m@fictif.test", telephone: "0600000000", adresse: "Lyon", numPermis: "", dateDelivrancePermis: "", prefecturePermis: "" },
      vehiculeChoisi: true, immatriculation: "HK-870-BF", dateDebut: "2026-11-20", dateFin: "2026-11-20", prixLocation: "150", tarifJournalier: "60",
      regime: "non_determine", assurance: assuranceComplete(), edlDepartSigne: false, consentementSpecifique: false, texteValideJuridiquement: false,
    });
    expect(b).toContain("Permis B (numéro, date, autorité de délivrance)");
    expect(b).toContain("Qualité du locataire (consommateur ou professionnel)");
    expect(b.some(x => x.startsWith("Consentement spécifique"))).toBe(true);
    expect(b).toContain("Validation du texte final après vérification juridique humaine");
  });
});
