import { describe, it, expect } from "vitest";
import { choisirTentativeRevision, revisionBaseId } from "@/lib/revisionFaussesTentative";
import { auditQrcCoherence } from "@/lib/examPassageIdentity";

describe("Révision des fausses : jamais de réécriture d'une révision terminée", () => {
  const base = revisionBaseId("EB1");
  it("première révision : identifiant historique", () => {
    expect(choisirTentativeRevision(base, [])).toBe("revision_fausses_EB1");
  });
  it("révision terminée : nouvelle tentative distincte", () => {
    expect(choisirTentativeRevision(base, [{ exercice_id: base, completed: true }])).toBe(`${base}__r2`);
  });
  it("tentative en cours reprise telle quelle", () => {
    expect(choisirTentativeRevision(base, [
      { exercice_id: base, completed: true },
      { exercice_id: `${base}__r2`, completed: false },
    ])).toBe(`${base}__r2`);
  });
  it("ignore les autres examens (EB10 ≠ EB1)", () => {
    expect(choisirTentativeRevision(base, [{ exercice_id: "revision_fausses_EB10", completed: true }])).toBe(base);
  });
});

describe("Audit QRC : source unique nouveau moteur", () => {
  const ligneDrapeau = {
    id: "r1", apprenant_id: "a", quiz_id: "EB1", matiere_id: "francais", tentative: 15,
    completed_at: "2026-10-11T21:23:16Z",
    details: {
      qrc_pending_correction: true,
      questions: [{ id: 1, type: "QRC" }],
      correctionsIA: { 1: { explication: "Correction déterministe" } },
      reponses: { 1: "texte" },
    },
  } as any;
  it("ligne couverte par un passage nouveau moteur : aucune fausse divergence", () => {
    const r = auditQrcCoherence([ligneDrapeau], { couvertParNouveauMoteur: () => true });
    expect(r.incoherences).toHaveLength(0);
    expect(r.passages).toBe(0);
  });
  it("ligne historique non couverte : règle historique inchangée (reste à corriger)", () => {
    const r = auditQrcCoherence([ligneDrapeau], { couvertParNouveauMoteur: () => false });
    expect(r.qrcToCorrect).toBe(1);
  });
});
