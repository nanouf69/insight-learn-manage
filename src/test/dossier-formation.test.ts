import { describe, it, expect } from "vitest";
import { etatInscriptionExamen, isElearningType } from "@/lib/dossierFormation";
describe("Mon dossier de formation", () => {
  it("1 e-learning tout complété + statut CRM", () => expect(etatInscriptionExamen(true, "a_payer")).toEqual({ niveau: "orange", libelle: "À payer", bloque: false }));
  it("2 sans dossier de bienvenue", () => expect(etatInscriptionExamen(false, "inscription_validee").niveau).toBe("rouge"));
  it("3 ancien dossier sans signature = bloqué", () => expect(etatInscriptionExamen(false, null).libelle).toBe("Dossier de bienvenue requis"));
  it("4 signé, statut vide", () => expect(etatInscriptionExamen(true, null).libelle).toBe("En attente d'inscription"));
  it("5 inscription validée", () => expect(etatInscriptionExamen(true, "inscription_validee")).toEqual({ niveau: "vert", libelle: "Inscription validée", bloque: false }));
  it("6 non e-learning", () => { expect(isElearningType("vtc")).toBe(false); expect(isElearningType("VTC-E")).toBe(true); expect(isElearningType("taxi e-learning")).toBe(true); });
});
