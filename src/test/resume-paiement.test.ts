// @vitest-environment node
import { describe, it, expect } from "vitest";
import { resumePaiement } from "@/lib/resumePaiement";
describe("resumePaiement", () => {
  it("non payé", () => expect(resumePaiement(200, []).libelle).toBe("💳 Payé : 0 € / 200 € — Reste : 200 €"));
  it("partiel", () => expect(resumePaiement(200, [{ montant: 50 }]).libelle).toBe("💳 Payé : 50 € / 200 € — Reste : 150 €"));
  it("deux paiements", () => expect(resumePaiement(200, [{ montant: 50 }, { montant: "100" }]).reste).toBe(50));
  it("intégral", () => expect(resumePaiement(200, [{ montant: 150 }, { montant: 50 }]).libelle).toBe("✅ Payé intégralement : 200 € / 200 €"));
});
