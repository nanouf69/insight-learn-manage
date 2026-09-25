// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  buildExerciceId,
  buildRevisionExerciceId,
  exoIdDepuisRevision,
  journaliserEchecValidationQuiz,
} from "@/lib/quizAttempts";

const src = readFileSync(resolve(__dirname, "../components/cours-en-ligne/ModuleDetailView.tsx"), "utf8");

describe("Quiz de module — résultat seulement après confirmation serveur", () => {
  it("le résultat n'est affiché qu'après envoi, relecture et validation serveur", () => {
    const start = src.indexOf("VALIDATION DÉFINITIVE CÔTÉ SERVEUR");
    const flush = src.indexOf("flushAnswerSavesAndWait(apprenantId, exerciceId)", start);
    const relecture = src.indexOf("answersAreEqual(aComparer, exoAnswers)", start);
    const submit = src.indexOf("submitQuizAttempt({", start);
    const affichage = src.indexOf("afficherResultatValide();", start);
    expect(start).toBeGreaterThan(0);
    expect(flush).toBeGreaterThan(start);
    expect(relecture).toBeGreaterThan(flush);
    expect(submit).toBeGreaterThan(relecture);
    expect(affichage).toBeGreaterThan(submit);
  });

  it("chaque échec garde les réponses, propose « Réessayer la validation » et journalise l'étape", () => {
    ["envoi", "relecture", "validation_serveur", "exception"].forEach((e) =>
      expect(src).toContain(`echec("${e}")`),
    );
    expect(src).toContain("Réessayer la validation");
    expect(src).toContain("Enregistrement en cours…");
  });

  it("journal d'échec : élève, module, exercice, étape", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    journaliserEchecValidationQuiz({ apprenantId: "a1", moduleId: 2, exerciceId: "module_2_exo_61", etape: "relecture" });
    expect(spy.mock.calls[0][0]).toMatch(/apprenant=a1 module=2 exercice=module_2_exo_61 etape=relecture/);
    spy.mockRestore();
  });
});

describe("Révision d'un quiz déjà validé", () => {
  it("identifiant distinct, hors motif module_X_exo_% compté par le serveur", () => {
    const id = buildRevisionExerciceId(2, 61);
    expect(id).toBe("module_2_revision_exo_61");
    expect(id).not.toBe(buildExerciceId(2, 61));
    expect(id.startsWith("module_2_exo_")).toBe(false);
    expect(/^module_(\d+)_exo_(\d+)$/.test(id)).toBe(false);
    expect(exoIdDepuisRevision(id)).toBe(61);
    expect(exoIdDepuisRevision("module_2_exo_61")).toBeNull();
  });

  it("une révision ne crée jamais de nouvelle validation ni ne réécrit la ligne validée", () => {
    const start = src.indexOf("VALIDATION DÉFINITIVE CÔTÉ SERVEUR");
    const bloc = src.slice(start, src.indexOf("afficherResultatValide();", start));
    expect(bloc).toMatch(/if \(!enRevision\) \{\s*const submitted = await submitQuizAttempt/);
    expect(bloc).toContain("buildRevisionExerciceId(module.id, exo.id)");
  });

  it("« Refaire les fausses » reste disponible et bascule sur la révision si le quiz est validé", () => {
    expect(src).toContain("const startWrongQuestionRevision");
    expect(src).toContain("if (submittedExoIdsRef.current.has(pending.exoId)) revisionActiveRef.current.add(pending.exoId);");
  });
});
