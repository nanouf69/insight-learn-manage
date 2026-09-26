import { describe, it, expect } from "vitest";
import { ajouterMarqueurCorrectionQCMAdmin } from "@/lib/correctionQCMAdminMarqueur";

describe("marqueur correction QCM admin", () => {
  it("ajoute le marqueur et conserve toutes les autres clés", () => {
    const details = { correctionsIA: { "5": { note: 2 } }, autre: 1 };
    const r = ajouterMarqueurCorrectionQCMAdmin(details, "admin-1", "2026-09-26T00:00:00Z");
    expect(r.correctionsIA).toEqual(details.correctionsIA);
    expect(r.autre).toBe(1);
    expect(r.correctionQCMAdmin).toEqual({
      manuel: true, validatedByAdmin: true, correctedAt: "2026-09-26T00:00:00Z", par: "admin-1",
    });
  });
  it("gère details vide ou invalide", () => {
    expect(Object.keys(ajouterMarqueurCorrectionQCMAdmin(null, null, "t"))).toEqual(["correctionQCMAdmin"]);
    expect(Object.keys(ajouterMarqueurCorrectionQCMAdmin([1], null, "t"))).toEqual(["correctionQCMAdmin"]);
  });
});
