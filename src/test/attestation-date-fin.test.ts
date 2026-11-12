import { describe, it, expect } from "vitest";
import { dateFinDepuisConnexions } from "@/lib/attestationFinValidee/dateFin";
const c = (id: string, s: string) => ({ id, started_at: s });
describe("date de fin = dernière connexion", () => {
  it("prend la connexion la plus récente, date Paris, avec identité", () => {
    const r = dateFinDepuisConnexions({ dateLimiteCrm: "2026-10-31", connexions: [c("a", "2026-10-01T08:00:00Z"), c("b", "2026-10-19T22:30:00Z")], dateDebut: "2026-09-14", derniereValidation: "2026-10-10T10:00:00Z" });
    expect(r).toEqual({ etat: "ok", date: "2026-10-20", connexionId: "b", startedAt: "2026-10-19T22:30:00Z", source: "Dernière connexion e-learning enregistrée", dateLimiteCrm: "2026-10-31" });
  });
  it("aucune connexion ou lecture impossible => bloquée", () => {
    expect(dateFinDepuisConnexions({ dateLimiteCrm: "2026-10-31", connexions: [], dateDebut: null, derniereValidation: "2026-10-01T00:00:00Z" }).etat).toBe("bloquee");
    expect(dateFinDepuisConnexions({ dateLimiteCrm: "2026-10-31", connexions: null, dateDebut: null, derniereValidation: "x" }).etat).toBe("bloquee");
  });
  it("modules ignorés : validation inconnue ou postérieure ne bloque pas", () => {
    expect(dateFinDepuisConnexions({ dateLimiteCrm: "2026-10-31", connexions: [c("a", "2026-10-01T08:00:00Z")], dateDebut: "2026-09-14", derniereValidation: "2026-10-05T00:00:00Z" }).etat).toBe("ok");
    expect(dateFinDepuisConnexions({ dateLimiteCrm: "2026-10-31", connexions: [c("a", "2026-10-01T08:00:00Z")], dateDebut: null, derniereValidation: null }).etat).toBe("ok");
  });
  it("connexion avant le début => bloquée", () => {
    expect(dateFinDepuisConnexions({ dateLimiteCrm: "2026-10-31", connexions: [c("a", "2026-09-01T08:00:00Z")], dateDebut: "2026-09-14" }).etat).toBe("bloquee");
  });
});
