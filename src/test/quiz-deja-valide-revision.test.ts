import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildExerciceId, buildRevisionExerciceId } from "@/lib/quizAttempts";

const s = readFileSync(resolve(__dirname, "../components/cours-en-ligne/ModuleDetailView.tsx"), "utf8");

describe("Quiz déjà validé puis refait (incident « Ville de Lyon » du 10/10)", () => {
  it("les sauvegardes d'un quiz validé partent sous l'identifiant de révision", () => {
    expect(s).toContain("revisionActiveRef.current.has(exoId) || submittedExoIdsRef.current.has(exoId)");
    expect(buildRevisionExerciceId(8, 1785332774763)).not.toBe(buildExerciceId(8, 1785332774763));
  });
  it("la validation relit le statut serveur et bascule en révision au lieu d'un faux échec", () => {
    const i = s.indexOf("let flushed = await flushAnswerSavesAndWait(apprenantId, exerciceId);");
    expect(i).toBeGreaterThan(0);
    const bloc = s.slice(i, i + 4000);
    expect(bloc).toContain('.select("status")');
    expect(bloc).toContain("isAttemptSubmitted(statutRow as any)");
    expect(bloc).toContain("exerciceId = buildRevisionExerciceId(module.id, exo.id);");
    expect(bloc).toContain('echec("envoi_revision")');
    // La relecture vient APRÈS la bascule ; en révision, jamais de nouvelle validation de la ligne validée.
    expect(bloc.indexOf('etapeEnCours = "relecture"')).toBeGreaterThan(bloc.indexOf("buildRevisionExerciceId"));
    expect(/if \(!enRevision\) \{\s*const submitted = await submitQuizAttempt\(/.test(s)).toBe(true);
  });
});
