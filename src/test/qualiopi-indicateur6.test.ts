import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { EMPLOIS_DU_TEMPS, adaptationVide, verifierAdaptation, verifierDocx } from "@/components/qualiopi/indicateur6";

describe("Indicateur 6 — horaires et preuves réelles", () => {
  it.each([
    [0, 60, 6, 66, 2, "9h-12h / 13h-16h"],
    [1, 40, 6, 46, 2, "17h-21h"],
    [2, 90, 6, 96, 3, "9h-12h / 13h-16h"],
  ])("conserve le programme %i", (index, theorie, conduite, total, semaines, horaires) => {
    expect(EMPLOIS_DU_TEMPS[Number(index)]).toMatchObject({ theorie, conduite, total, semaines, horaires });
  });
  it("refuse un faux DOCX", async () => {
    const file = { name: "original.docx", size: 12, arrayBuffer: async () => new TextEncoder().encode("not a docx").buffer } as File;
    await expect(verifierDocx(file)).rejects.toThrow();
  });
  it("accepte les octets d’un vrai conteneur DOCX", async () => {
    const zip = new JSZip(); zip.file("word/document.xml", "<document/>"); zip.file("[Content_Types].xml", "<Types/>");
    const bytes = await zip.generateAsync({ type: "arraybuffer" });
    await expect(verifierDocx({ name: "original.docx", size: bytes.byteLength, arrayBuffer: async () => bytes } as File)).resolves.toBeUndefined();
  });
  it("ne crée aucune adaptation par défaut", () => {
    expect(() => verifierAdaptation(adaptationVide(), "2026-11-18")).toThrow();
  });
  const actual = { stagiaire_reference: "TEST", session_reference: "TEST", date_decision: "2026-11-17", besoin: "Support accessible", adaptation: "Support agrandi", responsable: "Référent", date_mise_en_place: "2026-11-18", preuve_application: "Référence vérifiable", verification_efficacite: "Vérifiée avec le stagiaire", suite: "Maintien", validation: "Validation référent", mise_en_oeuvre_confirmee: true };
  it("exige la confirmation de mise en œuvre réelle", () => {
    expect(() => verifierAdaptation({ ...actual, mise_en_oeuvre_confirmee: false }, "2026-11-18")).toThrow();
  });
  it("refuse une mise en place future", () => {
    expect(() => verifierAdaptation({ ...actual, date_mise_en_place: "2026-11-19" }, "2026-11-18")).toThrow();
  });
  it("refuse une preuve d’application vide", () => {
    expect(() => verifierAdaptation({ ...actual, preuve_application: " " }, "2026-11-18")).toThrow();
  });
  it("accepte une traçabilité complète explicitement confirmée", () => {
    expect(() => verifierAdaptation(actual, "2026-11-18")).not.toThrow();
  });
});