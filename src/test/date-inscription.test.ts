// @vitest-environment node
import { describe, it, expect } from "vitest";
import { dateInscriptionAffichee, inscriptionTropTardive, joursOuvresEntre, parseDateExamen } from "@/lib/dateInscription";
describe("date d'inscription", () => {
  it("CPF prioritaire sinon CRM", () => {
    expect(dateInscriptionAffichee({ date_acceptation_cpf: "2026-09-01", created_at: "2026-08-01T10:00:00Z" })).toEqual({ date: "2026-09-01", source: "cpf" });
    expect(dateInscriptionAffichee({ created_at: "2026-08-01T10:00:00Z" })).toEqual({ date: "2026-08-01", source: "crm" });
  });
  it("15 jours ouvrés", () => {
    expect(joursOuvresEntre(parseDateExamen("2026-09-07")!, parseDateExamen("2026-09-28")!)).toBe(15);
    expect(inscriptionTropTardive("2026-09-07", "28 septembre 2026")).toBe(false);
    expect(inscriptionTropTardive("2026-09-08", "28 septembre 2026")).toBe(true);
    expect(inscriptionTropTardive("2026-09-08", null)).toBe(false);
  });
});
