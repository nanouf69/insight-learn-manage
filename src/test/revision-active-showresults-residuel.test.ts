import { describe, expect, it } from "vitest";
import { exoSauvegardable, reponseQuizAcceptee, resultatsInitiauxAffiches } from "@/lib/revisionFaussesEtat";
import { buildExerciceId, buildRevisionExerciceId } from "@/lib/quizAttempts";

// Reproduction fictive du cas module 4 / exo 102 : reprise ouverte, état
// « résultats affichés » résiduel, 240 cases vides dans la révision.
type Saves = Record<string, Record<string, string>>;
function simulerClic(p: { showResults: boolean; revisionOuverte: boolean; soumis: boolean }, saves: Saves, local: Record<string, string>) {
  const exoId = 102, moduleId = 4, key = "102-1";
  if (!reponseQuizAcceptee({ apercuAdmin: false, verrouillee: false, showResults: p.showResults, revisionOuverte: p.revisionOuverte })) return { local, saves };
  const nextLocal = { ...local, [key]: "B" };
  if (exoSauvegardable({ soumis: p.soumis, fige: false, revisionOuverte: p.revisionOuverte, force: false })) {
    const id = p.soumis ? buildRevisionExerciceId(moduleId, exoId) : buildExerciceId(moduleId, exoId);
    saves = { ...saves, [id]: { ...(saves[id] ?? {}), [key]: "B" } };
  }
  return { local: nextLocal, saves };
}

describe("reprise active avec showResults résiduel", () => {
  const initiale = Object.freeze({ "102-1": "A" });
  const base = (): Saves => ({ module_4_exo_102: { ...initiale }, module_4_revision_exo_102: { "102-1": "" } });

  it("clic → nouvelle réponse locale, sauvegardée sous la révision, remise initiale inchangée", () => {
    const r = simulerClic({ showResults: true, revisionOuverte: true, soumis: true }, base(), { "102-1": "" });
    expect(buildRevisionExerciceId(4, 102)).toBe("module_4_revision_exo_102");
    expect(r.local["102-1"]).toBe("B");
    expect(r.saves.module_4_revision_exo_102["102-1"]).toBe("B");
    expect(r.saves.module_4_exo_102).toEqual(initiale);
  });

  it("contrôles de résultat initiaux masqués pendant la reprise ouverte", () => {
    expect(resultatsInitiauxAffiches({ showResults: true, revisionOuverte: true })).toBe(false);
    expect(resultatsInitiauxAffiches({ showResults: true, revisionOuverte: false })).toBe(true);
  });

  it("sans reprise ouverte, les résultats affichés bloquent toujours le clic et aucune écriture", () => {
    const saves = base();
    const r = simulerClic({ showResults: true, revisionOuverte: false, soumis: true }, saves, { "102-1": "A" });
    expect(r.local["102-1"]).toBe("A");
    expect(r.saves).toEqual(saves);
  });

  it("aperçu admin et réponse verrouillée restent refusés", () => {
    expect(reponseQuizAcceptee({ apercuAdmin: true, verrouillee: false, showResults: false, revisionOuverte: true })).toBe(false);
    expect(reponseQuizAcceptee({ apercuAdmin: false, verrouillee: true, showResults: false, revisionOuverte: true })).toBe(false);
  });
});
