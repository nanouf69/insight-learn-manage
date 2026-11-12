import { describe, it, expect } from "vitest";
import { eligibiliteAttestation } from "@/lib/attestationFinValidee/eligibilite";
import { appliquer, doublonActif, type Attestation } from "@/lib/attestationFinValidee/cycle";
import { texteAttestation, champsManquants, empreinteAttestation } from "@/lib/attestationFinValidee/modele";

const ok = (id: number) => ({ id, nom: `M${id}`, statutEffectif: "completed", preuveComplete: true });

describe("éligibilité", () => {
  it("3/7 modules et 38h11/60h ne bloquent plus l'attestation", () => {
    const r = eligibiliteAttestation({
      modulesAttribues: [26, 2, 3, 4, 35, 5, 8],
      modules: [ok(35), ok(5), ok(8), { id: 2, nom: "M2", statutEffectif: "in_progress", preuveComplete: false }, { id: 4, nom: "M4", statutEffectif: "completed", preuveComplete: false }],
      elearning: { faites: 38 + 11 / 60, minimum: 60 }, presentiel: null,
    });
    expect(r.eligible).toBe(true);
    expect(r.motifs).toEqual([]);
  });
  it("modules non validés mais heures atteintes => éligible", () => {
    expect(eligibiliteAttestation({ modulesAttribues: [2], modules: [{ id: 2, nom: "M2", statutEffectif: "in_progress", preuveComplete: false }], elearning: { faites: 60, minimum: 60 }, presentiel: null }).eligible).toBe(true);
  });
  it("tout prouvé => éligible", () => {
    expect(eligibiliteAttestation({ modulesAttribues: [1, 2], modules: [ok(1), ok(2)], elearning: { faites: 60, minimum: 60 }, presentiel: { signees: 20, attendues: 20 } }).eligible).toBe(true);
  });
  it("heures e-learning indisponibles non bloquantes, signatures manquantes toujours bloquantes", () => {
    expect(eligibiliteAttestation({ modulesAttribues: [1], modules: [ok(1)], elearning: { faites: null, minimum: 60 }, presentiel: null }).eligible).toBe(true);
    expect(eligibiliteAttestation({ modulesAttribues: [1], modules: [ok(1)], elearning: null, presentiel: { signees: 17, attendues: 20 } }).motifs[0].code).toBe("signatures_manquantes");
  });
  it("erreur de lecture => bloquée", () => {
    expect(eligibiliteAttestation({ modulesAttribues: [1], modules: [ok(1)], elearning: null, presentiel: null, lectureErreur: "réseau" }).eligible).toBe(false);
  });
});

const base: Attestation = { id: "a", apprenantId: "d1", apprenantUserId: "u-eleve", version: 1, statut: "a_verifier", empreinte: "abc", signatureCentre: null, signatureApprenant: null };
const admin = { role: "admin" as const, userId: "u-admin" };
const eleve = { role: "apprenant" as const, userId: "u-eleve" };

describe("cycle", () => {
  it("bloquée si inéligible ou signature centre non autorisée", () => {
    expect(appliquer(base, admin, { type: "valider_pour_signature", eligible: false, signatureCentreAutorisee: { consentementId: "c" } }, "t").ok).toBe(false);
    expect(appliquer(base, admin, { type: "valider_pour_signature", eligible: true, signatureCentreAutorisee: null }, "t").ok).toBe(false);
  });
  it("parcours complet daté avec identité", () => {
    const r1 = appliquer(base, admin, { type: "valider_pour_signature", eligible: true, signatureCentreAutorisee: { consentementId: "c" } }, "2026-11-12T10:00:00Z");
    expect(r1.ok && r1.attestation.signatureCentre).toEqual({ parUserId: "u-admin", at: "2026-11-12T10:00:00Z", consentementId: "c" });
    const r2 = r1.ok ? appliquer(r1.attestation, eleve, { type: "signer_apprenant", empreinteVue: "abc", at: "2026-11-12T11:00:00Z" }, "x") : null;
    expect(r2?.ok && r2.attestation.statut).toBe("signee");
  });
  it("admin ne signe jamais à la place de l'apprenant ; autre élève refusé ; contenu modifié refusé", () => {
    const a = { ...base, statut: "a_signer" as const };
    expect(appliquer(a, admin, { type: "signer_apprenant", empreinteVue: "abc", at: "t" }, "t").ok).toBe(false);
    expect(appliquer(a, { role: "apprenant", userId: "autre" }, { type: "signer_apprenant", empreinteVue: "abc", at: "t" }, "t").ok).toBe(false);
    expect(appliquer(a, eleve, { type: "signer_apprenant", empreinteVue: "zzz", at: "t" }, "t").ok).toBe(false);
  });
  it("apprenant ne peut pas valider sa propre attestation", () => {
    expect(appliquer(base, eleve, { type: "valider_pour_signature", eligible: true, signatureCentreAutorisee: { consentementId: "c" } }, "t").ok).toBe(false);
  });
  it("révocation bloque toute suite ; doublon actif refusé", () => {
    const r = appliquer(base, admin, { type: "revoquer", motif: "erreur" }, "t");
    expect(r.ok && appliquer(r.attestation, eleve, { type: "signer_apprenant", empreinteVue: "abc", at: "t" }, "t").ok).toBe(false);
    expect(doublonActif([{ apprenantId: "d1", statut: "signee" }], "d1")).toBe(true);
    expect(doublonActif([{ apprenantId: "d1", statut: "revoquee" }], "d1")).toBe(false);
  });
});

describe("modèle", () => {
  const c = { representant: "R", nom: "Dupont", prenom: "Jean", formation: "VTC", modalite: "E-learning", dateDebut: "2026-09-14", dateFin: "2026-10-31", dureeHeures: 60, dateEmission: "2026-11-12" };
  it("champ manquant => aucun texte", () => {
    expect(texteAttestation({ ...c, dureeHeures: null })).toBeNull();
    expect(champsManquants({ ...c, representant: "" })).toContain("représentant du centre");
  });
  it("empreinte change si le texte change", async () => {
    const a = await empreinteAttestation(texteAttestation(c)!, "d1");
    const b = await empreinteAttestation(texteAttestation({ ...c, dureeHeures: 61 })!, "d1");
    expect(a).not.toBe(b);
    expect(texteAttestation(c)!.join(" ")).toContain("ne vaut pas réussite à l'examen");
  });
});
