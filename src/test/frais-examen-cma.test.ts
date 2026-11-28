// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FRAIS_EXAMEN_CMA_INFORMATION, FRAIS_EXAMEN_CMA_PASSERELLE_INFORMATION, fraisExamenCma } from "@/lib/fraisExamenCma";
import { candidatsAPayer, tarifExamen } from "@/lib/candidatsAPayer";

describe("Frais CMA datés, décision 25/11/2026", () => {
  it("241 € jusqu'au 31 décembre 2026 Paris", () => expect(fraisExamenCma(new Date("2026-12-31T22:59:59Z"))).toBe(241));
  it("246 € dès le 1er janvier 2027 Paris", () => expect(fraisExamenCma(new Date("2026-12-31T23:00:00Z"))).toBe(246));
  it.each(["vtc", "taxi", "VTC présentiel", "TAXI e-learning"])("%s : nouveau tarif 2027", type => expect(tarifExamen(type, "26 janvier 2027")).toBe(246));
  it("la session 2026 ne suit pas l'horloge 2027", () => expect(tarifExamen("taxi", "2026-11-17")).toBe(241));
  it.each(["va", "ta", "VA-présentiel", "TA e-learning"])("%s reste 168 € en 2027", type => expect(tarifExamen(type, "2027-01-01")).toBe(168));
  it("aucune date inventée si elle manque", () => expect(fraisExamenCma(null)).toBe(241));
  it("total mixte par date, sans muter paiements/dossiers", () => {
    const rows = [{type:"vtc", date:"2026-11-17", statut:null, paiement:241}, {type:"taxi",date:"2027-01-26",statut:null,paiement:0}, {type:"ta",date:"2027-01-26",statut:null,paiement:0}, {type:"vtc",date:"2027-01-26",statut:"paye",paiement:241}];
    const before = structuredClone(rows);
    expect(candidatsAPayer(rows, a=>a.statut, a=>a.type, a=>a.date).montant).toBe(655);
    expect(rows).toEqual(before);
  });

  it("introduction TAXI/VTC : examen complet 241 € en 2026 puis 246 € au 1er janvier 2027", () => {
    expect(FRAIS_EXAMEN_CMA_INFORMATION).toContain("examen complet 241 € en 2026 ; 246 € à partir du 1er janvier 2027");
  });

  it("introductions passerelles : 168 € en 2026 puis 171 € au 1er janvier 2027", () => {
    expect(FRAIS_EXAMEN_CMA_PASSERELLE_INFORMATION).toContain("examen passerelle 168 € en 2026 ; 171 € à partir du 1er janvier 2027");
  });

  it("introductions TAXI/VTC et passerelles : pratique seule 118 € en 2026 puis 120 € au 1er janvier 2027", () => {
    for (const texte of [FRAIS_EXAMEN_CMA_INFORMATION, FRAIS_EXAMEN_CMA_PASSERELLE_INFORMATION]) {
      expect(texte).toContain("Épreuve pratique seule : 118 € en 2026 ; 120 € à partir du 1er janvier 2027");
    }
  });

  it("les montants de repassage ne sont pas assimilés aux trois tarifs CMA", () => {
    expect(FRAIS_EXAMEN_CMA_INFORMATION).toContain("repassage après échec sont distincts");
    expect(FRAIS_EXAMEN_CMA_PASSERELLE_INFORMATION).toContain("repassage après échec sont distincts");
  });
});