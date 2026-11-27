import { describe, it, expect } from "vitest";
import { revisionFaussesTerminee, revisionRepriseProuvee, questionsRevisionRestantes, validationEcritRevision } from "@/lib/revisionFaussesEtat";

// Cas anonymisé tiré de l'état réel (module 4, exo 100) : initiale remise,
// révision où les fausses ont été effacées ([]), puis copies miroirs sur les autres exos.
const init = { "100-1": ["B"], "100-2": ["D"], "100-3": ["A"] };
const fausses = ["100-1", "100-2"];

describe("révisions après rechargement", () => {
  it("copie miroir : ni reprise ni terminée", () => {
    expect(revisionRepriseProuvee(init, { ...init }, fausses)).toBe(false);
    expect(revisionFaussesTerminee(init, { ...init }, fausses)).toBe(false);
  });
  it("fausses effacées : reprise réelle, seules les vides restent à refaire", () => {
    const rev = { ...init, "100-1": [], "100-2": [] };
    expect(revisionRepriseProuvee(init, rev, fausses)).toBe(true);
    expect(questionsRevisionRestantes(rev, fausses)).toEqual(["100-1", "100-2"]);
    expect(revisionFaussesTerminee(init, rev, fausses)).toBe(false);
  });
  it("une réponse identique à l'initiale ne fait pas boucler la correction", () => {
    const rev = { ...init, "100-1": ["C"], "100-2": ["D"] };
    expect(questionsRevisionRestantes(rev, fausses)).toEqual([]);
    expect(revisionFaussesTerminee(init, rev, fausses)).toBe(true);
  });
  it("valider un quiz remis sans révision ouverte n'écrit aucune copie", () => {
    expect(validationEcritRevision({ dejaRemis: true, revisionOuverte: false })).toBe(false);
    expect(validationEcritRevision({ dejaRemis: true, revisionOuverte: true })).toBe(true);
    expect(validationEcritRevision({ dejaRemis: false, revisionOuverte: false })).toBe(true);
  });
});
