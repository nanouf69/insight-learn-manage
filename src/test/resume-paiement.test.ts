// @vitest-environment node
import { describe, it, expect } from "vitest";
import { resumePaiement } from "@/lib/resumePaiement";
describe("resumePaiement", () => {
  it("non payé", () => expect(resumePaiement(200, []).libelle).toBe("💳 Payé : 0 € / 200 € — Reste : 200 €"));
  it("partiel", () => expect(resumePaiement(200, [{ montant: 50 }]).libelle).toBe("💳 Payé : 50 € / 200 € — Reste : 150 €"));
  it("deux paiements", () => expect(resumePaiement(200, [{ montant: 50 }, { montant: "100" }]).reste).toBe(50));
  it("intégral", () => expect(resumePaiement(200, [{ montant: 150 }, { montant: 50 }]).libelle).toBe("✅ Payé intégralement : 200 € / 200 €"));
});
import { exclureVirementsLiesAilleurs, virementsCorrespondants } from "@/lib/resumePaiement";
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
  it("même virement lié malgré une date de saisie différente : jamais compté deux fois", () =>
    expect(resumePaiement(200, [{ montant: 50, date_paiement: "2026-09-22", transaction_bancaire_id: "tx-a" }], [{ ...v, id: "tx-a" }]).paye).toBe(50));
  it("deux vrais virements égaux avec deux identités : tous deux comptés", () =>
    expect(resumePaiement(200, [{ montant: 50, date_paiement: "2026-09-22", transaction_bancaire_id: "tx-a" }], [{ ...v, id: "tx-a" }, { ...v, id: "tx-b", date_operation: "2026-09-22" }]).paye).toBe(100));
  it("multi-session : un virement lié à un autre dossier n'est pas recompté", () => {
    const banque = [{ ...v, id: "tx-a" }, { ...v, id: "tx-b" }];
    const liens = [{ apprenant_id: "autre-dossier", transaction_bancaire_id: "tx-a" }];
    expect(exclureVirementsLiesAilleurs(banque, liens, "dossier-courant").map((x) => x.id)).toEqual(["tx-b"]);
    expect(exclureVirementsLiesAilleurs(banque, liens, "autre-dossier")).toHaveLength(2);
  });
});

import { dedoublonnerVirements as dedup2, resumePaiement as rp2 } from "@/lib/resumePaiement";
describe("virements importés plusieurs fois", () => {
  const tx = (id: string) => ({ id, montant: 200, date_operation: "2026-10-29", libelle: "Chika IMAUJI", banque: "Revolut Pro", reference: "ref-1" });
  it("7 imports de la même référence = un seul virement de 200 €", () => {
    const r = rp2(1400, [], [1, 2, 3, 4, 5, 6, 7].map((i) => tx(String(i))));
    expect(r.virementsAjoutes).toHaveLength(1);
    expect(r.paye).toBe(200);
  });
  it("un doublon d'un virement déjà enregistré n'est pas recompté", () => {
    const r = rp2(1400, [{ montant: 200, transaction_bancaire_id: "3" }], [tx("1"), tx("3")]);
    expect(r.paye).toBe(200);
  });
  it("références différentes restent distinctes", () => {
    expect(dedup2([tx("1"), { ...tx("2"), reference: "ref-2" }])).toHaveLength(2);
  });
});
