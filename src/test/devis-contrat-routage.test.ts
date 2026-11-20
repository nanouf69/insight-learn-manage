import { describe, it, expect } from "vitest";
import { pagesContratDansDevis } from "@/lib/devisContratRoutage";
import { DEVIS_VALANT_CONTRAT_ACTIF } from "@/components/crm/apprenant-sections/DevisSection";
describe("devis ≠ contrat", () => {
  it("mode désactivé : aucun contrat dans le devis, même en financement personnel", () => expect(pagesContratDansDevis(DEVIS_VALANT_CONTRAT_ACTIF, true, true)).toBe(false));
  it("contrat brouillon : jamais dans le devis", () => expect(pagesContratDansDevis(true, true, false)).toBe(false));
});
