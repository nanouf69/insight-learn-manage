import { describe, expect, it } from "vitest";
import { dateEmissionFactureFournisseur } from "@/lib/comptabilite/factureFournisseur";

describe("identité des factures fournisseurs", () => {
  it("affiche la date réelle 23/01/2026 plutôt que la date d’enregistrement", () => {
    expect(dateEmissionFactureFournisseur({
      date_facture: "2026-01-23",
      created_at: "2026-11-25T17:48:00Z",
    })).toBe("2026-01-23");
  });

  it("conserve l’ancien affichage pour une facture historique sans date renseignée", () => {
    expect(dateEmissionFactureFournisseur({
      date_facture: null,
      created_at: "2026-05-22T08:29:03Z",
    })).toBe("2026-05-22T08:29:03Z");
  });
});
