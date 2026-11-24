import { describe, expect, it } from "vitest";
import { RI_SERVICES_PRO_V1, RI_SERVICES_PRO_V2, snapshotReglementServicesPro, versionReglementPourInscription } from "@/lib/reglementServicesPro";
import { COMPETENCES_CHAMPS, validerCompetences, validerJustificatif } from "@/lib/competencesIntervenant";

describe("Règlement versionné SERVICES PRO", () => {
  it("future inscriptions only, strict decision boundary and unknown date excluded", () => {
    expect(versionReglementPourInscription("2026-11-24T16:41:00Z")).toBe("services-pro-ri-historique-v1");
    expect(versionReglementPourInscription("2026-11-24T16:41:01Z")).toBe("services-pro-ri-2026-11-24-v2");
    expect(versionReglementPourInscription(null)).toBeNull();
  });
  it("retains twenty original articles and appends only article 21 without mutating the original version", () => {
    expect(RI_SERVICES_PRO_V1).toHaveLength(20);
    expect(RI_SERVICES_PRO_V2).toHaveLength(21);
    expect(RI_SERVICES_PRO_V2.slice(0, 20)).toEqual(RI_SERVICES_PRO_V1);
    expect(RI_SERVICES_PRO_V2[20].num).toBe(21);
    expect(RI_SERVICES_PRO_V1.some(a => a.num === 21)).toBe(false);
  });
  it("stores a separate dated acceptance snapshot, not references to a mutable version", () => {
    const snapshot = snapshotReglementServicesPro();
    expect(snapshot.ri_version).toBe("services-pro-ri-2026-11-24-v2");
    expect(snapshot.ri_date_version).toBe("2026-11-24");
    snapshot.ri_articles[0].num = 99;
    expect(RI_SERVICES_PRO_V1[0].num).toBe(1);
  });
});
describe("Justification de compétences", () => {
  const answers = Object.fromEntries(COMPETENCES_CHAMPS.map(field => [field.id, "Déclaration réelle"]));
  it("requires an explicit declaration, never a preselected or truthy value", () => {
    for (const value of [false, undefined, "true", 1]) expect(validerCompetences(answers, value)).not.toBeNull();
    expect(validerCompetences(answers, true)).toBeNull();
  });
  it("requires each factual field and limits its size", () => {
    for (const field of COMPETENCES_CHAMPS) {
      expect(validerCompetences({ ...answers, [field.id]: " " }, true)).not.toBeNull();
      expect(validerCompetences({ ...answers, [field.id]: "x".repeat(12_001) }, true)).not.toBeNull();
    }
  });
  it("allows private PDF/JPEG/PNG up to 4 MiB and refuses executable/empty/oversized files", () => {
    expect(validerJustificatif({ size: 4 * 1024 * 1024, type: "application/pdf" })).toBe(true);
    expect(validerJustificatif({ size: 4 * 1024 * 1024 + 1, type: "application/pdf" })).toBe(false);
    expect(validerJustificatif({ size: 0, type: "image/png" })).toBe(false);
    expect(validerJustificatif({ size: 12, type: "text/html" })).toBe(false);
  });
});