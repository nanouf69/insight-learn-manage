import { describe, it, expect } from "vitest";
import { verifierDemande, isWeekend } from "../../../supabase/functions/save-emargement-apprenant/regularisation";

const reg = {
  auth_user_id: "u1",
  apprenant_id: "a1",
  expire_le: "2026-11-30T23:00:00Z",
  creneaux: [{ date: "2026-09-14", creneau: "soir_1" }, { date: "2026-09-14", creneau: "soir_2" }],
};
const sig = "data:image/png;base64," + "A".repeat(300);
const now = new Date("2026-10-19T14:00:00Z");
const ok = { apprenant_id: "a1", date_emargement: "2026-09-14", demi_journee: "soir_1", confirme_presence_creneau: true, signature_data_url: sig };

describe("régularisation émargements", () => {
  it("accepte un créneau autorisé confirmé et signé", () => expect(verifierDemande(reg, "u1", ok, now).ok).toBe(true));
  it("refuse un autre compte", () => expect(verifierDemande(reg, "u2", ok, now).ok).toBe(false));
  it("refuse un autre dossier", () => expect(verifierDemande(reg, "u1", { ...ok, apprenant_id: "a2" }, now).ok).toBe(false));
  it("refuse un créneau hors liste", () => expect(verifierDemande(reg, "u1", { ...ok, date_emargement: "2026-09-15" }, now).ok).toBe(false));
  it("refuse sans confirmation de présence", () => expect(verifierDemande(reg, "u1", { ...ok, confirme_presence_creneau: false }, now).ok).toBe(false));
  it("refuse sans signature", () => expect(verifierDemande(reg, "u1", { ...ok, signature_data_url: "" }, now).ok).toBe(false));
  it("refuse une absence", () => expect(verifierDemande(reg, "u1", { ...ok, absent: true }, now).ok).toBe(false));
  it("refuse après expiration", () => expect(verifierDemande(reg, "u1", ok, new Date("2026-12-01T00:00:00Z")).ok).toBe(false));
  it("refuse une date non passée", () => expect(verifierDemande({ ...reg, creneaux: [{ date: "2026-10-19", creneau: "soir_1" }] }, "u1", { ...ok, date_emargement: "2026-10-19" }, now).ok).toBe(false));
  it("refuse le week-end", () => {
    expect(isWeekend("2026-09-19")).toBe(true);
    expect(verifierDemande({ ...reg, creneaux: [{ date: "2026-09-19", creneau: "soir_1" }] }, "u1", { ...ok, date_emargement: "2026-09-19" }, now).ok).toBe(false);
  });
});
