import React from "react";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChoixApresQuiz } from "@/components/cours-en-ligne/learnerQuizUi";
import { questionAvecCleFigee, exoIdDepuisArchive } from "@/components/cours-en-ligne/passagesFiges";
import { buildExerciceId, buildRevisionExerciceId, exoIdDepuisRevision, isAttemptSubmitted } from "@/lib/quizAttempts";
import { revisionRepriseProuvee, questionsRevisionRestantes, validationEcritRevision } from "@/lib/revisionFaussesEtat";

// Execute the actual nested functions, not a copied algorithm. Every dependency
// that can talk to a service is injected; no real session, queue or network.
const source = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
const ast = ts.createSourceFile("ModuleDetailView.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function findNode(predicate: (node: ts.Node) => boolean): ts.Node {
  let found: ts.Node | undefined;
  const visit = (node: ts.Node) => { if (!found && predicate(node)) found = node; if (!found) ts.forEachChild(node, visit); };
  visit(ast);
  if (!found) throw new Error("Actual production function not found");
  return found;
}
function evaluate(code: string, deps: Record<string, unknown>): any {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  return new Function(...Object.keys(deps), js)(...Object.values(deps));
}
function actualFunction(name: string, deps: Record<string, unknown>): any {
  const node = findNode(n => ts.isVariableDeclaration(n) && n.name.getText(ast) === name) as ts.VariableDeclaration;
  if (!node.initializer) throw new Error("Function has no body");
  return evaluate(`return (${node.initializer.getText(ast)});`, deps);
}
function validation(deps: Record<string, unknown>): Promise<void> {
  const start = source.indexOf("// VALIDATION DÉFINITIVE CÔTÉ SERVEUR (status = submitted).");
  const node = findNode(n => ts.isIfStatement(n) && n.getStart(ast) > start &&
    n.getStart(ast) < start + 1000 && n.expression.getText(ast) === "apprenantId") as ts.IfStatement;
  const parent = node.parent;
  if (!ts.isBlock(parent)) throw new Error("Missing validation body");
  const statements = parent.statements.slice(parent.statements.indexOf(node));
  return evaluate(`return (async () => { ${statements.map(n => n.getText(ast)).join("\n")} })();`, deps);
}
function deferred<T>() {
  let resolve: ((value: T) => void) | undefined;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve: (value: T) => { if (!resolve) throw new Error("Missing resolver"); resolve(value); } };
}
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Quiz : confirmation tardive de la même version", () => {
  function fixture() {
    const read = deferred<{ data: any; error: any }>();
    const answers = { "100-1": ["B"] };
    const show = vi.fn();
    const submit = vi.fn(async () => ({ status: "submitted" }));
    const locks = new Set([100]);
    const user = { current: "synthetic-user" };
    const currentDraft = { current: answers };
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: { status: "in_progress" }, error: null })) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
    const deps = {
      apprenantId: "synthetic-owner", module: { id: 4 }, exo: { id: 100 }, selectedAnswers: answers,
      selectedAnswersRef: currentDraft,
      revisionActiveRef: { current: new Set() }, submittedExoIdsRef: { current: new Set() },
      revisionOuverteRef: { current: new Set() }, userIdForSaveRef: user,
      validationEnCoursRef: { current: locks }, totalQuestionsModuleRef: { current: 1 },
      dernierEnvoiValideRef: { current: new Map() }, exoCorrect: 0, exoTotalQ: 1,
      setValidatingExo: vi.fn(), setValidationFailedFor: vi.fn(), setValidationSessionPerdueFor: vi.fn(),
      assurerSessionFraiche: vi.fn(async () => "synthetic-token"), journaliserEchecValidationQuiz: vi.fn(),
      enqueueAnswerSave: vi.fn(), flushAnswerSavesAndWait: vi.fn(async () => true), getConfirmedWriteSeq: () => 2,
      buildExerciceId, buildRevisionExerciceId, isAttemptSubmitted, validationEcritRevision,
      supabase: { from: vi.fn(() => query) }, relireAvecReprisesBornees: vi.fn(() => read.promise),
      codeErreurSur: () => "synthetic-error", answersAreEqual: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b),
      submitQuizAttempt: submit, afficherResultatValide: show,
      toast: { success: vi.fn() }, VALIDATION_QUIZ_DELAI_MS: 20_000,
    };
    return { read, deps, show, submit, locks, user, answers, currentDraft,
      confirmed: { apprenant_id: "synthetic-owner", exercice_id: "module_4_exo_100", write_seq: 2, reponses: answers } };
  }
  it("après 20 s, la relecture exacte autorise une seule remise et le choix post-quiz", async () => {
    vi.useFakeTimers();
    const f = fixture();
    const pending = validation(f.deps);
    await vi.advanceTimersByTimeAsync(20_001);
    await pending;
    expect(f.show).not.toHaveBeenCalled();
    expect(f.submit).not.toHaveBeenCalled();
    expect(f.locks.has(100)).toBe(true);
    f.read.resolve({ data: f.confirmed, error: null });
    await vi.advanceTimersByTimeAsync(0);
    expect(f.submit).toHaveBeenCalledTimes(1);
    expect(f.submit).toHaveBeenCalledWith(expect.objectContaining({ exerciceId: "module_4_exo_100", reponses: f.answers }));
    expect(f.show).toHaveBeenCalledTimes(1);
    expect(f.locks.has(100)).toBe(false);
  });
  it.each(["error", "answers", "version", "owner", "exercise", "absent", "account", "draft"])(
    "après délai, %s non confirmé interdit résultat et remise", async failure => {
      vi.useFakeTimers();
      const f = fixture();
      const pending = validation(f.deps);
      await vi.advanceTimersByTimeAsync(20_001); await pending;
      const data = { ...f.confirmed };
      if (failure === "answers") data.reponses = { "100-1": ["D"] };
      if (failure === "version") data.write_seq = 3;
      if (failure === "owner") data.apprenant_id = "other-owner";
      if (failure === "exercise") data.exercice_id = "module_4_exo_101";
      if (failure === "account") f.user.current = "other-user";
      if (failure === "draft") f.currentDraft.current = { "100-1": ["D"] };
      f.read.resolve({ data: failure === "absent" ? null : data, error: failure === "error" ? { code: "503" } : null });
      await vi.advanceTimersByTimeAsync(0);
      expect(f.submit).not.toHaveBeenCalled();
      expect(f.show).not.toHaveBeenCalled();
      expect(f.locks.has(100)).toBe(false);
    },
  );
  it("confirmation immédiate reste une seule remise", async () => {
    const f = fixture(); f.read.resolve({ data: f.confirmed, error: null });
    await validation(f.deps);
    expect(f.submit).toHaveBeenCalledTimes(1); expect(f.show).toHaveBeenCalledTimes(1);
  });
});

describe("Archive : proposer une révision sans l'ouvrir ni changer le résultat initial", () => {
  async function fixture(reponses: Record<string, string[]>, archiveError = false, submitted = false) {
    const initiales = { "100-1": ["B"], "100-2": ["B"], "100-3": ["A"] };
    const archive = { exercice_id: "module_4_exo_100", reponses: initiales,
      cle_figee: Object.fromEntries([1, 2, 3].map(id => [`100-${id}`, { choix: [{ lettre: "A", correct: true }, { lettre: "B", correct: false }] }])),
      score_bonnes: 1, nb_repondues: 3, nb_questions: 3 };
    const before = JSON.stringify(archive);
    const state = { answers: { ...initiales }, results: new Set([100]), pending: {} as Record<number, any>, done: {} as Record<number, any>, questions: {} as Record<number, any> };
    const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), in: vi.fn(() => query),
      then: (resolve: any) => resolve({ data: archiveError ? null : [archive], error: archiveError ? { code: "503" } : null }) };
    const deps: Record<string, any> = {
      apprenantId: "synthetic-owner", module: { id: 4 },
      activeExercicesRef: { current: [{ id: 100, questions: [1, 2, 3].map(id => ({ id, choix: [{ lettre: submitted ? "A" : "B", correct: true }] })) }] },
      fetchQuizAttempts: vi.fn(async () => [{ exercice_id: "module_4_revision_exo_100", status: "in_progress", reponses, write_seq: 2 }]),
      supabase: { from: vi.fn(() => query) }, primeKnownWriteSeq: vi.fn(),
      mergeSavedAndPendingAnswers: (base: unknown) => base,
      exoIdDepuisRevision, exoIdDepuisArchive, buildExerciceId, buildRevisionExerciceId, isAttemptSubmitted,
      questionAvecCleFigee, revisionRepriseProuvee, questionsRevisionRestantes,
      revisionActiveRef: { current: new Set() }, revisionOuverteRef: { current: new Set() },
      setSelectedAnswers: (f: any) => { state.answers = f(state.answers); },
      setShowResultsFor: (f: any) => { state.results = f(state.results); },
      setRepriseEnAttente: (f: any) => { state.pending = f(state.pending); },
      setRevisionsTerminees: (f: any) => { state.done = f(state.done); },
      setRevisionQuestionsFor: (f: any) => { state.questions = f(state.questions); }, scheduleScrollToRevisionStart: vi.fn(),
    };
    deps.isAnswerCorrect = actualFunction("isAnswerCorrect", { getQuestionChoices: (q: any) => q?.choix ?? [] });
    await actualFunction("appliquerRevisions", deps)(submitted ? [{ exercice_id: "module_4_exo_100", status: "submitted", reponses: initiales }] : []);
    return { state, deps, archive, before, query };
  }
  it("reload partiel : initiale conservée, Reprendre explicite et Suivant fonctionnel sans écriture", async () => {
    const f = await fixture({ "100-1": ["C"], "100-2": [], "100-3": ["A"] });
    expect(f.state.answers).toEqual(f.archive.reponses);
    expect(f.state.results.has(100)).toBe(true);
    expect(f.deps.revisionOuverteRef.current.size).toBe(0);
    expect(f.deps.revisionActiveRef.current.size).toBe(0);
    expect(f.state.pending[100].questions).toEqual([2]);
    expect(f.query.eq).toHaveBeenCalledWith("apprenant_id", "synthetic-owner");
    expect(f.query.eq).toHaveBeenCalledWith("module_id", 4);
    const suivant = vi.fn();
    const reprendre = actualFunction("reprendreRevisionEnAttente", { ...f.deps, repriseEnAttente: f.state.pending });
    render(<ChoixApresQuiz fausses={2} repriseEnCours onRelire={() => reprendre(100)} onSuivant={suivant} />);
    fireEvent.click(screen.getByRole("button", { name: /suivant/i }));
    expect(suivant).toHaveBeenCalledTimes(1); expect(f.state.answers).toEqual(f.archive.reponses);
    fireEvent.click(screen.getByRole("button", { name: /Reprendre/ }));
    expect(f.deps.revisionOuverteRef.current.has(100)).toBe(true);
    expect(f.state.answers["100-1"]).toEqual(["C"]);
    expect(f.state.questions[100]).toEqual(new Set([2]));
    expect(JSON.stringify(f.archive)).toBe(f.before);
  });
  it("révision complète n'est pas redemandée après reload", async () => {
    const f = await fixture({ "100-1": ["C"], "100-2": ["B"], "100-3": ["A"] });
    expect(f.state.pending).toEqual({}); expect(f.state.done[100]["100-1"]).toEqual(["C"]);
    expect(f.deps.revisionOuverteRef.current.size).toBe(0); expect(f.state.answers).toEqual(f.archive.reponses);
  });
  it("miroir identique n'est pas une reprise", async () => {
    const f = await fixture({ "100-1": ["B"], "100-2": ["B"], "100-3": ["A"] });
    expect(f.state.pending).toEqual({}); expect(f.state.done).toEqual({});
  });
  it("erreur de lecture archive ne crée ni reprise ni preuve", async () => {
    const f = await fixture({ "100-1": [], "100-2": [] }, true);
    expect(f.state.pending).toEqual({}); expect(f.state.done).toEqual({});
    expect(f.state.answers).toEqual(f.archive.reponses); expect(f.deps.revisionOuverteRef.current.size).toBe(0);
  });
  it("quiz soumis non archivé garde le choix de reprise existant", async () => {
    const f = await fixture({ "100-1": ["C"], "100-2": [], "100-3": ["A"] }, false, true);
    expect(f.state.pending[100].questions).toEqual([2]); expect(f.deps.supabase.from).not.toHaveBeenCalled();
    expect(f.state.answers).toEqual(f.archive.reponses);
  });
});