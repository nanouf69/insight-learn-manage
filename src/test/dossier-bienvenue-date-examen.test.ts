// @vitest-environment node
import { describe, it, expect } from "vitest";
import { dateExamenDossierBienvenue } from "@/lib/dossierBienvenueDepot";

describe("dateExamenDossierBienvenue — réponse du dossier de bienvenue prioritaire", () => {
  it("retourne la réponse du dossier de bienvenue", () => {
    const docs = [
      { type_document: "dossier-bienvenue", donnees: { date_examen_theorique: "17 novembre 2026" } },
    ];
    expect(dateExamenDossierBienvenue(docs)).toBe("17 novembre 2026");
  });

  it("retourne null si le dossier est absent (repli sur la date la plus proche)", () => {
    expect(dateExamenDossierBienvenue([])).toBeNull();
    expect(dateExamenDossierBienvenue([{ type_document: "autre", donnees: {} }])).toBeNull();
  });

  it("retourne null si la réponse est vide (repli sur la date la plus proche)", () => {
    const docs = [{ type_document: "dossier-bienvenue", donnees: { date_examen_theorique: "  " } }];
    expect(dateExamenDossierBienvenue(docs)).toBeNull();
  });

  it("ignore les valeurs non textuelles", () => {
    const docs = [{ type_document: "dossier-bienvenue", donnees: { date_examen_theorique: 42 } }];
    expect(dateExamenDossierBienvenue(docs as any)).toBeNull();
  });
});
