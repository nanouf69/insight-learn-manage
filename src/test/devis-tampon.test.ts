import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: async () => ({ data: [], error: null }) } }));
// En vitest (node), « ?inline » rend un chemin de fichier : on fournit un PNG 1x1 en data URL.
vi.mock("@/assets/tampon-ftransport.png?inline", () => ({
  default: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
}));
import { buildCanonicalDevisPDF } from "@/lib/pdf/devis-canonical";

/**
 * Règle (28/10/2026, choix utilisateur) : le tampon SERVICES PRO FTRANSPORT
 * figure sur CHAQUE devis téléchargé, dans les deux encadrés « Pour FTRANSPORT »
 * (page signature + bordereau de renonciation).
 */
describe("tampon FTRANSPORT sur chaque devis", () => {
  it("insère le tampon dans les deux encadrés « Pour FTRANSPORT »", () => {
    const doc = buildCanonicalDevisPDF({
      numDevis: "DV-TEST-2026",
      dateDevis: new Date("2026-10-28"),
      dateValidite: new Date("2026-11-28"),
      client: { prenom: "Test", nom: "Client", ville: "Lyon" },
      typeFinancement: "personnel",
      formation: { designation: "Formation VTC", type: "vtc" },
      lignes: [{ designation: "Formation VTC", quantite: 1, prixUnitaire: 1099 }],
      signatureDataUrl: null,
    });
    const pdf = Buffer.from(doc.output("arraybuffer")).toString("latin1");
    const images = pdf.split("/Subtype /Image").length - 1;
    expect(images).toBeGreaterThanOrEqual(2);
  });
});
