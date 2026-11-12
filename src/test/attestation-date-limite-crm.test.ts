import { describe, expect, it } from "vitest";
import { dateFinDepuisConnexions } from "../../supabase/functions/_shared/modeleAttestationFin";
import { finFormationCrm } from "../../supabase/functions/_shared/attestationFinCore";

const base = { dateDebut: "2026-09-14", dateLimiteCrm: "2026-10-31", connexions: [{ id: "connexion-fictive", started_at: "2026-11-12T17:00:00Z" }] };
describe("fin d'attestation limitée à la fin CRM", () => {
  it("une connexion du 12 novembre ne produit jamais une fin après le 31 octobre", () => {
    expect(dateFinDepuisConnexions(base)).toMatchObject({ etat: "ok", date: "2026-10-31", startedAt: "2026-11-12T17:00:00Z", dateLimiteCrm: "2026-10-31" });
    expect(base.connexions[0].started_at).toBe("2026-11-12T17:00:00Z");
  });
  it("une dernière connexion antérieure reste la date de fin", () => {
    expect(dateFinDepuisConnexions({ ...base, connexions: [{ id: "c", started_at: "2026-10-19T08:00:00Z" }] })).toMatchObject({ etat: "ok", date: "2026-10-19" });
  });
  it("compare les jours Paris, y compris une connexion le 1 novembre à minuit Paris", () => {
    expect(dateFinDepuisConnexions({ ...base, connexions: [{ id: "c", started_at: "2026-10-31T23:30:00Z" }] })).toMatchObject({ etat: "ok", date: "2026-10-31" });
  });
  it.each([null, "", "invalide", "2026-02-30"])("sans limite CRM valide (%s) : aucune date inventée", dateLimiteCrm => {
    expect(dateFinDepuisConnexions({ ...base, dateLimiteCrm }).etat).toBe("bloquee");
  });
  it("une limite CRM antérieure au début bloque", () => {
    expect(dateFinDepuisConnexions({ ...base, dateLimiteCrm: "2026-09-01" }).etat).toBe("bloquee");
  });
  it("la fin des cours en ligne affichée dans le CRM est prioritaire pour e-learning", () => {
    const a: any = { date_fin_cours_en_ligne: "2026-10-31", date_fin_formation: "2026-11-30" };
    expect(finFormationCrm(a, true)).toBe("2026-10-31");
    expect(finFormationCrm(a, false)).toBe("2026-11-30");
  });
});
import { dateFinDepuisConnexions as dfc2 } from "../../supabase/functions/_shared/modeleAttestationFin";
describe("Date de fin = dernier jour réel avant la date rouge", () => {
  it("ignore une connexion après la fin CRM et prend le dernier jour avant", () => {
    const r: any = dfc2({ dateDebut: "2026-09-14", dateLimiteCrm: "2026-10-31", connexions: [
      { id: "c1", started_at: "2026-11-01T09:00:00Z" }, { id: "c2", started_at: "2026-10-20T09:00:00Z" }] });
    expect(r.date).toBe("2026-10-20");
  });
  it("prend la pratique signée si elle est plus tardive que l'e-learning", () => {
    const r: any = dfc2({ dateDebut: "2026-09-14", dateLimiteCrm: "2026-10-31", connexions: [
      { id: "c2", started_at: "2026-10-20T09:00:00Z" }, { id: "emargement:x", started_at: "2026-10-28T11:00:00Z" }] });
    expect(r.date).toBe("2026-10-28");
    expect(r.source).toContain("signature");
  });
});
