import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { buildDevisFcTaxiPdf, delaiRetractationFcTaxi, echeancierFcTaxi, ecartPrixFcTaxi, texteDevisFcTaxi, articlesFcTaxi } from "@/lib/pdf/devis-fc-taxi";

const client = { nomComplet: "Jean Exemple", adresse: "1 rue de la Paix", codePostal: "69200", ville: "Vénissieux", telephone: "0600000000", email: "jean@example.com" };
const base = { client, dates: "19 novembre 2026 + 20 novembre 2026", dateDevis: "18/11/2026" };

describe("Devis FC TAXI PDF", () => {
  it("délai 10 jours au centre, 14 jours à distance", () => {
    expect(delaiRetractationFcTaxi("centre")).toBe(10);
    expect(delaiRetractationFcTaxi("distance")).toBe(14);
    expect(articlesFcTaxi({ prix: 299, mode: "centre", dates: "" })[1].texte).toContain("10 jours");
    expect(articlesFcTaxi({ prix: 299, mode: "distance", dates: "" })[1].texte).toContain("14 jours");
  });
  it("acompte ≤ 30 % du prix", () => {
    expect(echeancierFcTaxi(299).acompte).toBe(50);
    expect(echeancierFcTaxi(100).acompte).toBe(30);
    for (const p of [100, 200, 299]) expect(echeancierFcTaxi(p).acompte).toBeLessThanOrEqual(p * 0.3);
    expect(echeancierFcTaxi(299).solde).toBe(249);
  });
  it("aucune phrase de renonciation à la rétractation", () => {
    for (const mode of ["centre", "distance"] as const) {
      const t = texteDevisFcTaxi({ ...base, prix: 299, mode }).toLowerCase();
      expect(t).not.toMatch(/renonce|l221-25|démarrage immédiat/);
      expect(t).not.toMatch(/chèque|cheque|100 %/);
    }
  });
  it("avertit l'écart 200 € vs 299 €", () => {
    expect(ecartPrixFcTaxi(200)).toBe("Prix du devis 200 € ≠ tarif public 299 €");
    expect(ecartPrixFcTaxi(299)).toBeNull();
  });
  it("conserve le prix de la ligne", () => {
    const t = texteDevisFcTaxi({ ...base, prix: 200, mode: "distance" });
    expect(t).toContain("Prix total de la formation : 200 €");
    expect(t).not.toContain("299");
  });
  it("génère un PDF exemple", () => {
    const f = { regular: readFileSync("public/fonts/DejaVuSans.ttf").toString("base64"), bold: readFileSync("public/fonts/DejaVuSans-Bold.ttf").toString("base64") };
    for (const mode of ["distance", "centre"] as const) {
      const doc = buildDevisFcTaxiPdf({ ...base, prix: 200, mode }, f);
      writeFileSync(`/tmp/devis-fc-taxi-${mode}.pdf`, Buffer.from(doc.output("arraybuffer")));
      expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    }
  });
});
