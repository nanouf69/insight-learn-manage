// @vitest-environment node
import { describe, expect, it } from "vitest";
import { pratiqueDocumentHours } from "../lib/pratiqueDocumentHours";
import { resolvePratiqueSlotParts, type PratiqueSlotDetail } from "../lib/pratiqueSlots";
import { generateDocumentIndividuelPdf } from "../lib/pdf/document-individuel";

function detail(type: "vtc" | "taxi", apresmidi = "13h-16h"): PratiqueSlotDetail {
  const parts = resolvePratiqueSlotParts({ matin: "9h-12h", apresmidi }, type);
  return { date: "2026-10-09", typeFormation: type, reservationCreneau: "journee", parts, minutes: 360, label: "Pratique" };
}
describe("Horaires des feuilles pratiques", () => {
  it.each(["vtc", "taxi"] as const)("reprend les créneaux %s", (type) => {
    expect(pratiqueDocumentHours("2026-10-09", "matin", [detail(type)])).toBe("9h - 12h");
    expect(pratiqueDocumentHours("2026-10-09", "apres_midi", [detail(type)])).toBe("13h - 16h");
  });
  it("respecte les horaires personnalisés", () => {
    expect(pratiqueDocumentHours("2026-10-09", "apres_midi", [detail("taxi", "13h30-17h")])).toBe("13h30 - 17h");
  });
  it("ne confond pas une soirée ou une autre date", () => {
    for (const part of ["soir_1", "soir_2"]) expect(pratiqueDocumentHours("2026-10-09", part, [detail("vtc")])).toBeUndefined();
    expect(pratiqueDocumentHours("2026-10-10", "matin", [detail("vtc")])).toBeUndefined();
    expect(pratiqueDocumentHours("2026-10-09", "matin", [])).toBeUndefined();
  });
  it("préserve le planning", () => {
    const details = [detail("vtc")];
    const before = JSON.stringify(details);
    pratiqueDocumentHours("2026-10-09", "apres_midi", details);
    expect(JSON.stringify(details)).toBe(before);
  });
  it("génère réellement le PDF avec horaires et préserve le document", async () => {
    const document = { type_document: "emargement-fc", titre: "Émargement pratique", completed_at: "2026-10-09T13:53:00Z", donnees: { date_emargement: "2026-10-09", demi_journee: "apres_midi", horaires: "13h - 16h", absent: false } };
    const before = JSON.stringify(document);
    const result = generateDocumentIndividuelPdf({ nom: "FICTIF", prenom: "Test", type_apprenant: "vtc" }, document, { returnBlob: true });
    expect(result).toBeDefined();
    if (!result) return;
    const pdf = Buffer.from(await result.blob.arrayBuffer()).toString("latin1");
    expect(pdf).toContain("Horaires de formation");
    expect(pdf).toContain("13h - 16h");
    expect(JSON.stringify(document)).toBe(before);
  });
});