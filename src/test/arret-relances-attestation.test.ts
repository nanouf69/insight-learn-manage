import { describe, expect, it, vi } from "vitest";
import { attestationSuspendRelances, relanceAutoriseeApresAttestation } from "../../supabase/functions/_shared/arretRelancesAttestation";

const prepare = { modele_code: "attestation_fin_formation", envoye_le: null, sent_at: null, envoi_etat: "prepare", statut: "prepare" };
function dbFictif(pages: Array<{ data: unknown; error: unknown }>) {
  const q: any = {};
  for (const m of ["select", "eq", "order", "ilike"]) q[m] = vi.fn(() => q);
  q.range = vi.fn(async () => pages.shift());
  q.limit = vi.fn(async () => pages.shift());
  return { from: vi.fn(() => q), q };
}
describe("aucune relance après mail de signature de fin de formation", () => {
  it("l'envoi confirmé interdit la relance, même après révocation du document", () => {
    expect(attestationSuspendRelances({ ...prepare, envoye_le: "2026-11-12T18:12:00Z", statut: "revoque" })).toBe(true);
  });
  it("un simple brouillon ou un envoi refusé ne vaut pas envoi", () => {
    expect(attestationSuspendRelances(prepare)).toBe(false);
  });
  it.each(["envoi_en_cours", "indetermine", "envoye"])("%s suspend les relances", envoi_etat => {
    expect(attestationSuspendRelances({ ...prepare, envoi_etat })).toBe(true);
  });
  it("un autre document envoyé ne bloque pas les relances", () => {
    expect(attestationSuspendRelances({ ...prepare, modele_code: "devis", envoye_le: "2026-11-12" })).toBe(false);
  });
  it("lit le dossier exact et empêche réellement le transport", async () => {
    const db = dbFictif([{ data: [{ ...prepare, envoi_etat: "envoye" }], error: null }]);
    const transport = vi.fn();
    if (await relanceAutoriseeApresAttestation(db, "eleve-A")) transport();
    expect(transport).not.toHaveBeenCalled();
    expect(db.q.eq).toHaveBeenCalledWith("apprenant_id", "eleve-A");
  });
  it("sans attestation envoyée, le transport reste possible", async () => {
    expect(await relanceAutoriseeApresAttestation(dbFictif([{ data: [prepare], error: null }]), "eleve-B")).toBe(true);
  });
  it("une lecture échouée interdit le transport", async () => {
    expect(await relanceAutoriseeApresAttestation(dbFictif([{ data: null, error: { message: "réseau" } }]), "eleve-A")).toBe(false);
  });
  it("ne manque pas un envoi au-delà de la première page", async () => {
    const db = dbFictif([{ data: Array(100).fill(prepare), error: null }, { data: [{ ...prepare, statut: "signe" }], error: null }]);
    expect(await relanceAutoriseeApresAttestation(db, "eleve-A")).toBe(false);
    expect(db.q.range).toHaveBeenCalledTimes(2);
  });
  it("relit avant chaque envoi sans cache de candidat", async () => {
    const db = dbFictif([{ data: [], error: null }, { data: [{ ...prepare, envoi_etat: "envoye" }], error: null }]);
    expect(await relanceAutoriseeApresAttestation(db, "eleve-A")).toBe(true);
    expect(await relanceAutoriseeApresAttestation(db, "eleve-A")).toBe(false);
  });
  it("une adresse partagée ne permet jamais de deviner un dossier", async () => {
    const db = dbFictif([{ data: [{ id: "A" }, { id: "B" }], error: null }]);
    expect(await relanceAutoriseeApresAttestation(db, null, "fictif@example.test")).toBe(false);
  });
});