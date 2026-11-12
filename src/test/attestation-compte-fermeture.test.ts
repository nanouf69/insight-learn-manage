import { describe, it, expect, vi } from "vitest";
import { fermerCompteApresAttestation, type FermetureDeps } from "../../supabase/functions/_shared/attestationCompteFermeture";
const document = { id: "doc-fictif", apprenant_id: "eleve-fictif", modele_code: "attestation_fin_formation", envoi_etat: "envoye", envoye_le: "2026-11-12T18:19:00Z" };
function fake() {
  return {
    lireDocument: vi.fn(async () => ({ ...document })),
    lireCompte: vi.fn(async () => ({ userId: "user-fictif", estAdmin: false, nombreDossiers: 1 })),
    refuserAccesServeur: vi.fn(async () => true),
    desactiverConnexion: vi.fn(async () => true),
    journaliser: vi.fn(async () => {}),
  } satisfies FermetureDeps;
}
describe("fermeture isolée après attestation", () => {
  it("envoi confirmé : ferme seulement l'identité du document et journalise", async () => {
    const d = fake();
    expect(await fermerCompteApresAttestation(d, document.id)).toEqual({ etat: "ferme" });
    expect(d.refuserAccesServeur).toHaveBeenCalledWith("eleve-fictif", "doc-fictif");
    expect(d.desactiverConnexion).toHaveBeenCalledWith("user-fictif");
  });
  it.each(["prepare", "envoi_en_cours", "indetermine"])("%s : ne ferme jamais sans envoi confirmé", async envoi_etat => {
    const d = fake(); d.lireDocument.mockResolvedValue({ ...document, envoi_etat, envoye_le: "" });
    expect((await fermerCompteApresAttestation(d, document.id)).etat).toBe("refuse");
    expect(d.refuserAccesServeur).not.toHaveBeenCalled();
  });
  it("refuse un compte admin", async () => {
    const d = fake(); d.lireCompte.mockResolvedValue({ userId: "u", estAdmin: true, nombreDossiers: 1 });
    expect((await fermerCompteApresAttestation(d, document.id)).etat).toBe("refuse");
    expect(d.desactiverConnexion).not.toHaveBeenCalled();
  });
  it("refuse de fermer un autre dossier lié au même compte", async () => {
    const d = fake(); d.lireCompte.mockResolvedValue({ userId: "u", estAdmin: false, nombreDossiers: 2 });
    expect((await fermerCompteApresAttestation(d, document.id)).etat).toBe("refuse");
  });
  it("ne prétend jamais fermer si l'accès serveur reste ouvert", async () => {
    const d = fake(); d.refuserAccesServeur.mockResolvedValue(false);
    expect((await fermerCompteApresAttestation(d, document.id)).etat).toBe("a_verifier");
    expect(d.desactiverConnexion).not.toHaveBeenCalled();
  });
  it("échec de désactivation visible, rejeu sans réexpédition", async () => {
    const d = fake(); d.desactiverConnexion.mockResolvedValueOnce(false);
    expect((await fermerCompteApresAttestation(d, document.id)).etat).toBe("a_verifier");
    expect((await fermerCompteApresAttestation(d, document.id)).etat).toBe("ferme");
    expect(d.journaliser).toHaveBeenCalledWith("eleve-fictif", "doc-fictif", "compte_ferme");
  });
});