// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compterQuizModule } from "@/lib/moduleQuizCounter";
import { attacherSourceUnique, coreFiablePourLigne, noteExamenAffichee } from "@/lib/noteExamenAffichee";
import { isExamAttemptPublicationPending } from "@/components/cours-en-ligne/exam-helpers";
import type { CoreMatiereState } from "@/lib/coreExamPublication";

const ids = [1, 2, 3, 4, 5, 50, 6, 60, 61, 62, 7, 72, 80, 81, 82];
const details = ids.flatMap((ex) => Array.from({ length: ex === 1 ? 4 : 1 }, (_, q) => ({ exerciceId: ex, questionId: q + 1, reponseEleve: "A" })));
const completed = { status: "completed", completed_at: "2026-07-19T14:36:14Z", score_obtenu: 735, score_max: 847, details };
const current = ids.map((id) => ({ id: String(id), label: `Quiz ${id}`, questionIds: id === 1 ? ["1", "2", "3", "4", "99"] : ["1"] }));

describe("Compteur accueil d’un module validé", () => {
  it("Thierno fictif : 15/15 depuis le relevé et score 735/847 inchangé", () => {
    expect(compterQuizModule([completed], current)).toMatchObject({ completedQuizzes: 15, totalQuizzes: 15 });
    expect(Math.round((completed.score_obtenu / completed.score_max) * 100)).toBe(87);
  });
  it("nouveauté après validation et révision : jamais exigées ni ajoutées", () => {
    const revision = { status: "in_progress", completed_at: "2026-10-08T00:00:00Z", details: [{ exerciceId: 999, questionId: 1, reponseEleve: "A" }] };
    expect(compterQuizModule([completed, revision], [...current, { id: "999", label: "Nouveau", questionIds: ["1"] }]).totalQuizzes).toBe(15);
  });
  it("quiz jamais répondu dans le relevé validé : jamais compté fait", () => {
    const row = { ...completed, details: [...details, { exerciceId: 77, questionId: 1, reponseEleve: "" }] };
    expect(compterQuizModule([row], current)).toMatchObject({ completedQuizzes: 15, totalQuizzes: 16 });
  });
  it("module en cours ou avant validation : questions actuelles exigées", () => {
    expect(compterQuizModule([{ ...completed, status: "in_progress" }], current).completedQuizzes).toBe(14);
    expect(compterQuizModule([], current).completedQuizzes).toBe(0);
  });
});

const fin = "2026-09-27T13:28:27.779Z";
const questions = [{ questionId: 1, type: "QRC", enonce: "Question" }, { questionId: 2, type: "QCM", enonce: "Choix" }];
const row = (o: any = {}) => ({ id: "r1", apprenant_id: "a", quiz_type: "examen_blanc", quiz_id: "EB5", matiere_id: "t3p", completed_at: "2026-09-27T13:28:28.272Z", score_obtenu: null, score_max: 20, note_sur_20: null, details: { qrc_pending_correction: true, reponses: { 1: "réponse complète", 2: ["B", "A"] }, questions, correctionsIA: { 1: { explication: "Correction déterministe", pointsObtenus: 1 } } }, ...o });
const core = (o: Partial<CoreMatiereState> = {}): CoreMatiereState => ({ attemptId: "att", apprenantId: "a", examId: "EB5", matiereId: "t3p", finishedAt: fin, qrcTotal: 1, qrcRestantes: 0, status: "definitif", note20: 14.5, pending: false, questions, answers: { "t3p:1": "réponse complète", "t3p:2": ["A", "B"] }, qrcProofs: [{ questionId: "t3p:1", reponse: "réponse complète", etat: "corrigee", note: 1 }], ...o });
const show = (r: any, states: CoreMatiereState[] | null, nf: Set<string> | null = new Set()) => noteExamenAffichee(attacherSourceUnique(r, states, nf));
const exam = { matieres: [{ id: "t3p", questions: [{ id: 1, type: "QRC" }] }] };

describe("QRC : preuve du même passage", () => {
  it("corrigée dans le même passage : publiée, même pour élève et admin", () => {
    const attached = attacherSourceUnique(row(), [core()], new Set());
    expect(noteExamenAffichee(attached)).toMatchObject({ etat: "note", note20: 14.5, source: "noyau" });
    expect(isExamAttemptPublicationPending([attached], exam)).toBe(false);
    expect(coreFiablePourLigne([core()], row())?.attemptId).toBe("att");
  });
  it("vraie attente noyau conservée", () => expect(show(row(), [core({ pending: true, qrcRestantes: 1, note20: null })]).etat).toBe("en_attente"));
  it("contenu différent ou identité de compte différente : aucune validation empruntée", () => {
    expect(show(row(), [core({ questions: [{ ...questions[0], enonce: "Autre sujet" }, questions[1]] })]).etat).toBe("en_attente");
    expect(show(row(), [core({ apprenantId: "autre" })]).etat).not.toBe("note");
  });
  it("autre tentative et ambiguïté : rien emprunté", () => {
    expect(show(row({ tentative: 2 }), [core({ tentative: 1 })]).etat).toBe("lecture_impossible");
    expect(show(row(), [core(), core({ attemptId: "att2", finishedAt: "2026-09-27T13:28:29Z" })]).etat).toBe("lecture_impossible");
    expect(show(row(), [core({ candidateResultIds: ["r1", "r2"] })]).etat).toBe("lecture_impossible");
  });
  it("réponse tronquée ou QRC divergente : note noyau masquée, préfixe déterministe refusé", () => {
    expect(show(row(), [core({ answers: { "t3p:1": "r", "t3p:2": ["A", "B"] } })])).toMatchObject({ etat: "en_attente", source: "ancien" });
    expect(show(row(), [core({ qrcProofs: [{ questionId: "t3p:1", reponse: "autre", etat: "corrigee", note: 1 }] })]).etat).toBe("en_attente");
  });
  it("note ancienne validée conservée quand le noyau est tronqué", () => {
    const valide = row({ score_obtenu: 12, details: { ...row().details, qrc_pending_correction: false } });
    expect(show(valide, [core({ answers: { "t3p:1": "r" } })])).toMatchObject({ etat: "note", note20: 12, source: "ancien" });
  });
  it("erreurs de lecture et zéro différent de null", () => {
    expect(show(row(), null).etat).toBe("lecture_impossible");
    expect(show(row(), [core()], null).etat).toBe("lecture_impossible");
    const zero = row({ score_obtenu: 0, details: { reponses: { 1: "x" } } });
    expect(show(zero, [])).toMatchObject({ etat: "note", note20: 0 });
    expect(show({ ...zero, score_obtenu: null }, [])).toMatchObject({ etat: "en_attente" });
  });
});