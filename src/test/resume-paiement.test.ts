// @vitest-environment node
import { describe, it, expect } from "vitest";
import { resumePaiement } from "@/lib/resumePaiement";
describe("resumePaiement", () => {
  it("non payé", () => expect(resumePaiement(200, []).libelle).toBe("💳 Payé : 0 € / 200 € — Reste : 200 €"));
  it("partiel", () => expect(resumePaiement(200, [{ montant: 50 }]).libelle).toBe("💳 Payé : 50 € / 200 € — Reste : 150 €"));
  it("deux paiements", () => expect(resumePaiement(200, [{ montant: 50 }, { montant: "100" }]).reste).toBe(50));
  it("intégral", () => expect(resumePaiement(200, [{ montant: 150 }, { montant: 50 }]).libelle).toBe("✅ Payé intégralement : 200 € / 200 €"));
});
import { virementsCorrespondants } from "@/lib/resumePaiement";
describe("virements reçus correspondants", () => {
  const v = { montant: 50, date_operation: "2026-09-20", libelle: "Laghouati Abdallah" };
  it("Laghouati : virement de 50 € compté", () =>
    expect(resumePaiement(200, [], virementsCorrespondants([v], "LAGHOUATI", "Abdallah", "2026-07-21")).libelle).toBe("💳 Payé : 50 € / 200 € — Reste : 150 €"));
  it("virement déjà enregistré comme paiement : jamais compté deux fois", () =>
    expect(resumePaiement(200, [{ montant: 50, date_paiement: "2026-09-20" }], [v]).paye).toBe(50));
  it("paiement + virement distincts : additionnés", () =>
    expect(resumePaiement(200, [{ montant: 100, date_paiement: "2026-09-01" }], [v]).reste).toBe(50));
  it("deux virements identiques, un seul saisi : un seul dédoublonné", () =>
    expect(resumePaiement(200, [{ montant: 50, date_paiement: "2026-09-20" }], [v, { ...v, id: "b" }]).paye).toBe(100));
  it("prénom seul ne suffit pas", () =>
    expect(virementsCorrespondants([{ montant: 50, libelle: "Abdallah Dupont" }], "LAGHOUATI", "Abdallah")).toHaveLength(0));
  it("nom = prénom : deux occurrences exigées", () =>
    expect(virementsCorrespondants([{ montant: 200, libelle: "Virement de Meziane DJOUDI" }], "MEZIANE", "Meziane")).toHaveLength(0));
  it("virement trop ancien ignoré", () =>
    expect(virementsCorrespondants([v], "LAGHOUATI", "Abdallah", "2026-10-01")).toHaveLength(0));
});
