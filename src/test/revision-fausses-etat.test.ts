import { describe, it, expect } from "vitest";
import { exoSauvegardable, revisionsSessionARestaurer, revisionFaussesTerminee } from "@/lib/revisionFaussesEtat";

describe("révision des fausses", () => {
  it("quiz remis sans révision ouverte : aucune écriture miroir", () => {
    expect(exoSauvegardable({ soumis: true, fige: false, revisionOuverte: false, force: false })).toBe(false);
    expect(exoSauvegardable({ soumis: true, fige: false, revisionOuverte: true, force: false })).toBe(true);
    expect(exoSauvegardable({ soumis: false, fige: false, revisionOuverte: false, force: false })).toBe(true);
  });
  it("révision dont les résultats sont affichés : jamais rouverte au rechargement", () => {
    expect(Object.keys(revisionsSessionARestaurer({ "106": [1], "7": [2] }, [106]))).toEqual(["7"]);
  });
  it("révision terminée seulement si chaque fausse a une nouvelle réponse", () => {
    const init = { "106-1": "A", "106-2": ["B"] };
    expect(revisionFaussesTerminee(init, { "106-1": "C", "106-2": ["A"] }, ["106-1", "106-2"])).toBe(true);
    expect(revisionFaussesTerminee(init, { ...init }, ["106-1", "106-2"])).toBe(false);
    expect(revisionFaussesTerminee(init, { "106-1": "C" }, ["106-1", "106-2"])).toBe(false);
  });
});
