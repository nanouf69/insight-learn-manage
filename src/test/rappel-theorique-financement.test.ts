// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mentionsFinancement } from "../../supabase/functions/_shared/modelesRappelTheorique";
import { preparerRappelTheorique, type DossierRappel } from "../../supabase/functions/_shared/rappelTheoriquePriorite";

describe("Éligibilité des mentions financement — sans sanctions automatiques", () => {
  for (const [cpf, franceTravail] of [[false, false], [true, false], [false, true], [true, true]]) {
    it(`mentions vérifiées CPF=${cpf} France Travail=${franceTravail}`, () => {
      expect(mentionsFinancement({ cpf, engagementsFranceTravail: franceTravail })).toEqual({ etat: "verifie", cpf, franceTravail });
    });
  }
  it("CPF inconnu : aucune conséquence présumée", () => expect(mentionsFinancement({ cpf: null, engagementsFranceTravail: false })).toEqual({ etat: "a_verifier", cpf: false, franceTravail: false }));
  it("engagements France Travail inconnus : inscription seule insuffisante", () => expect(mentionsFinancement({ cpf: false, engagementsFranceTravail: null })).toEqual({ etat: "a_verifier", cpf: false, franceTravail: false }));
  it("J+7 avec financement non vérifié ne prépare pas d'envoi", () => {
    const dossier: DossierRappel = {
      id: "eleve", filiere: "vtc", accesActif: true, exclu: false,
      dejaConnecte: true, incidentTechnique: false,
      obligations: [{ id: 2, obligatoire: true, pratique: false, dispense: false, terminee: false }],
      passage: { id: "passage", dossierId: "eleve", dateReelle: "2026-11-17", source: "cma_verifie", statut: "present" },
    };
    expect(preparerRappelTheorique({ dossier, maintenant: new Date("2026-11-24T10:00:00Z"), premiereDateExamenEligible: "2026-11-17", historique: [] }).etat).toBe("a_verifier");
  });
});