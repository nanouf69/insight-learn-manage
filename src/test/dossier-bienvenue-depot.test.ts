// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  etatDepotDossierBienvenue,
  libelleDepotDossierBienvenue,
} from "@/lib/dossierBienvenueDepot";

const signature = "data:image/png;base64,signature-valide";

describe("Date de dépôt du dossier de bienvenue", () => {
  it("affiche la date fiable de finalisation signée en heure de Paris", () => {
    const etat = etatDepotDossierBienvenue([{
      type_document: "dossier-bienvenue",
      donnees: { signature, date_completion: "2026-09-18T12:32:00.000Z" },
      created_at: "2026-09-10T08:00:00.000Z",
      completed_at: "2026-09-24T09:00:00.000Z",
      updated_at: "2026-09-24T09:00:00.000Z",
    } as any]);

    expect(etat.statut).toBe("depose");
    expect(libelleDepotDossierBienvenue(etat)).toBe("✅ Déposé le 18 septembre 2026 à 14:32");
  });

  it("indique qu'aucun dossier n'a été déposé lorsqu'il n'existe pas", () => {
    const etat = etatDepotDossierBienvenue([]);
    expect(etat).toEqual({ statut: "non_depose" });
    expect(libelleDepotDossierBienvenue(etat)).toBe("Non déposé");
  });

  it("n'invente aucune date lorsqu'un dossier existe sans date fiable", () => {
    const etat = etatDepotDossierBienvenue([{
      type_document: "dossier-bienvenue",
      donnees: { signature },
      created_at: "2026-09-10T08:00:00.000Z",
      completed_at: "2026-09-24T09:00:00.000Z",
      updated_at: "2026-09-24T09:00:00.000Z",
    } as any]);

    expect(etat).toEqual({ statut: "date_indisponible" });
    expect(libelleDepotDossierBienvenue(etat)).toBe("Date de dépôt non disponible");
  });

  it("n'utilise pas une date de finalisation sans signature valide", () => {
    const etat = etatDepotDossierBienvenue([{
      type_document: "dossier-bienvenue",
      donnees: { date_completion: "2026-09-18T12:32:00.000Z" },
    }]);

    expect(etat).toEqual({ statut: "date_indisponible" });
  });

  it("conserve côté serveur la première date de finalisation signée", () => {
    const source = readFileSync("supabase/functions/save-public-form/index.ts", "utf8");
    expect(source).toContain('typeDocument === "dossier-bienvenue"');
    expect(source).toContain("hasValidSignature(ancienEtat)");
    expect(source).toContain("date_completion: premiereDateDepot");
    expect(source).toContain("donnees: donneesAPersister");
  });
});