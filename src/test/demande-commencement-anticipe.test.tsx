import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { demandeCommencementApplicable, preuveDemandeCommencement, DEMANDE_COMMENCEMENT_TEXTE } from "@/lib/devis/demandeCommencementAnticipe";
import { PreuveConsentementFc } from "@/components/devis/PreuveConsentementFc";

describe("demande de commencement anticipé", () => {
  it("proposée au particulier sans contrat", () => expect(demandeCommencementApplicable({ contrat_conditions: null, organisation_id: null })).toBe(true));
  it("jamais proposée si une organisation paie", () => expect(demandeCommencementApplicable({ organisation_id: "org-1" })).toBe(false));
  it("jamais proposée sur un devis valant contrat (règles propres)", () => expect(demandeCommencementApplicable({ contrat_conditions: { x: 1 } })).toBe(false));
  it("le texte n'est pas une renonciation", () => {
    expect(DEMANDE_COMMENCEMENT_TEXTE).toMatch(/Je reste libre de me rétracter/);
    expect(DEMANDE_COMMENCEMENT_TEXTE).not.toMatch(/je renonce/i);
  });
  it("non coché est enregistré comme non coché, horodaté", () => {
    const p = preuveDemandeCommencement(false, "2026-11-20T17:30:00.000Z", null);
    expect(p.coche).toBe(false); expect(p.horodatage_serveur).toBe("2026-11-20T17:30:00.000Z");
  });
  it("le CRM affiche le choix", () => {
    render(<PreuveConsentementFc consentements={{ demande_commencement_anticipe: preuveDemandeCommencement(true, "2026-11-20T17:30:00.000Z", null) }} />);
    expect(screen.getByTestId("preuve-demande-commencement").textContent).toMatch(/DEMANDÉ par le client/);
  });
});
