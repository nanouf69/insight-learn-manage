import { describe, it, expect } from "vitest";
import { calculerAccesCours } from "@/lib/accesCoursFenetre";
import { construireConvocationHtml, estSiteLyonGenas, texteAccesCours, TEXTE_STATIONNEMENT } from "@/lib/convocationFormation";

const at = (d: string) => new Date(`${d}T09:00:00`);
const elearning = { type_apprenant: "vtc-e", date_debut_cours_en_ligne: "2026-11-02", date_fin_cours_en_ligne: "2027-01-31" };
const pres = { type_apprenant: "vtc", date_debut_formation: "2026-11-02", date_fin_formation: "2026-11-27" };

describe("accès aux cours selon les dates de la plateforme", () => {
  it("e-learning : fermé avant le début, ouvert pendant, fermé après la fin", () => {
    expect(calculerAccesCours({ apprenant: elearning, isFC: false, isPresentiel: false, maintenant: at("2026-11-01") }).statut).toBe("avant");
    expect(calculerAccesCours({ apprenant: elearning, isFC: false, isPresentiel: false, maintenant: at("2026-11-02") }).autorise).toBe(true);
    expect(calculerAccesCours({ apprenant: elearning, isFC: false, isPresentiel: false, maintenant: at("2027-01-31") }).autorise).toBe(true);
    expect(calculerAccesCours({ apprenant: elearning, isFC: false, isPresentiel: false, maintenant: at("2027-02-01") }).statut).toBe("apres");
  });
  it("présentiel : fermé la veille (jamais J-1), ouvert le 1er jour, fermé après la fin", () => {
    expect(calculerAccesCours({ apprenant: pres, isFC: false, isPresentiel: true, maintenant: at("2026-11-01") }).autorise).toBe(false);
    expect(calculerAccesCours({ apprenant: pres, isFC: false, isPresentiel: true, maintenant: at("2026-11-02") }).autorise).toBe(true);
    expect(calculerAccesCours({ apprenant: pres, isFC: false, isPresentiel: true, maintenant: at("2026-11-28") }).statut).toBe("apres");
  });
  it("date manquante : aucun accès automatique", () => {
    const r = calculerAccesCours({ apprenant: { type_apprenant: "vtc-e" }, isFC: false, isPresentiel: false, maintenant: at("2026-11-05") });
    expect(r.statut).toBe("manquant");
    expect(r.autorise).toBe(false);
    expect(calculerAccesCours({ apprenant: { type_apprenant: "vtc-e", date_debut_cours_en_ligne: "2026-11-02" }, isFC: false, isPresentiel: false, maintenant: at("2026-11-05") }).autorise).toBe(false);
  });
  it("ne modifie pas les dates de l'élève", () => {
    const a = { ...elearning };
    calculerAccesCours({ apprenant: a, isFC: false, isPresentiel: false, maintenant: at("2026-12-01") });
    expect(a).toEqual(elearning);
  });
});

describe("convocation", () => {
  const acces = calculerAccesCours({ apprenant: elearning, isFC: false, isPresentiel: false, maintenant: at("2026-10-21") });
  it("phrase d'accès avant / pendant / terminée / manquante", () => {
    expect(texteAccesCours(acces)).toBe("Vos cours seront accessibles à partir du 2 novembre 2026 et jusqu'au 31 janvier 2027.");
    expect(texteAccesCours({ ...acces, statut: "pendant" })).toMatch(/^Vos cours sont accessibles depuis le 2 novembre 2026/);
    expect(texteAccesCours({ ...acces, statut: "apres" })).toMatch(/est terminée/);
    expect(texteAccesCours({ statut: "manquant", debut: null, fin: null, autorise: false })).toMatch(/pas encore définie/);
  });
  it("stationnement avenue des Acacias seulement en présentiel au 86 route de Genas", () => {
    expect(estSiteLyonGenas("86 route de genas 69003 Lyon")).toBe(true);
    expect(estSiteLyonGenas("Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne")).toBe(false);
    const base = { intituleFormation: "VTC", acces, corpsModele: "<p>x</p>", dateDebut: "lundi 2 novembre 2026", dateFin: "vendredi 27 novembre 2026" };
    expect(construireConvocationHtml({ ...base, presentiel: true, lieu: "86 Route de Genas, 69003 Lyon" })).toContain(TEXTE_STATIONNEMENT);
    expect(construireConvocationHtml({ ...base, presentiel: true, lieu: "CMA" })).not.toContain("Acacias");
    expect(construireConvocationHtml({ ...base, presentiel: false, lieu: "86 Route de Genas, 69003 Lyon" })).not.toContain("Acacias");
    const html = construireConvocationHtml({ ...base, presentiel: true, lieu: "86 Route de Genas, 69003 Lyon" });
    expect(html).toContain("86 Route de Genas, 69003 Lyon");
    expect(html).not.toMatch(/gratuit|réservé/i);
    expect(html).toContain("CONVOCATION À LA FORMATION");
  });
});
