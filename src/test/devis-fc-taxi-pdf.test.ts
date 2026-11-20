import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { buildDevisFcTaxiPdf, delaiRetractationFcTaxi, echeancierFcTaxi, ecartPrixFcTaxi, texteDevisFcTaxi, articlesFcTaxi, manquesDevisFcTaxi, modeleFcTaxiPdf, modeFcTaxiDepuisModele, prixDepuisMontant, mailDevisFcTaxi } from "@/lib/pdf/devis-fc-taxi";

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
      const doc = buildDevisFcTaxiPdf({ ...base, dateValidite: "18/12/2026", prix: 200, mode }, f, null);
      writeFileSync(`/tmp/devis-fc-taxi-${mode}.pdf`, Buffer.from(doc.output("arraybuffer")));
      expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    }
  });
  it("médiateur non bloquant : PDF généré sans nom inventé ni placeholder", () => {
    expect(manquesDevisFcTaxi({ ...base, prix: 200, mode: "distance" })).toEqual([]);
    const doc = buildDevisFcTaxiPdf({ ...base, prix: 200, mode: "distance" }, undefined, null);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    const t = texteDevisFcTaxi({ ...base, prix: 200, mode: "distance" });
    expect(t).not.toMatch(/médiateur|COMPLÉTER|à confirmer/i);
  });
  it("bloque sans dates ni nom, sans produire de document", () => {
    expect(manquesDevisFcTaxi({ ...base, dates: "", prix: 200, mode: "distance" }).join()).toMatch(/dates/);
    expect(() => buildDevisFcTaxiPdf({ ...base, client: { ...client, nomComplet: "" }, prix: 200, mode: "distance" })).toThrow(/Devis non généré/);
  });
  it("devis signé : signature et horodatage intégrés au même PDF", () => {
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const doc = buildDevisFcTaxiPdf({ ...base, prix: 200, mode: "centre" }, undefined, null, { imagePng: png, horodatage: "20/11/2026 16:50:00", mention: "Lu et approuvé, bon pour accord" });
    writeFileSync("/tmp/devis-fc-taxi-signe.pdf", Buffer.from(doc.output("arraybuffer")));
    expect(Buffer.from(doc.output("arraybuffer")).toString("latin1")).toMatch(/\/Subtype \/Image/);
  });
  it("modèle enregistré : mode retrouvé, prix relu, mail sans TTC", () => {
    expect(modeFcTaxiDepuisModele(modeleFcTaxiPdf("centre"))).toBe("centre");
    expect(modeFcTaxiDepuisModele("fc_taxi")).toBeNull();
    expect(prixDepuisMontant("200.00 €")).toBe(200);
    const m = mailDevisFcTaxi("Jean", "Exemple", 200, "distance");
    expect(m.body).toContain("200 €"); expect(m.body).toContain("14 jours");
    expect(m.body).not.toMatch(/TTC|renon/i);
  });
});
