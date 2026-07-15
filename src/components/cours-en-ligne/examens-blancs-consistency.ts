// Auto-check: garantit qu'à chaque question, la « bonne réponse » calculée
// côté apprenant (score) est STRICTEMENT identique à la « réponse attendue »
// affichée côté admin (correction). Toute divergence est remontée comme erreur.
//
// Les deux vues lisent les mêmes champs source :
//   - QCM  : `choix[].correct` (lettres avec `correct === true`)
//   - QRC  : `reponseQRC` (ou fallback `reponses_possibles`)
// La vérification simule les DEUX dérivations et compare le résultat final,
// ce qui protège contre toute future divergence de code entre les 2 côtés.

import type { ExamenBlanc, Matiere, Question } from "./examens-blancs-data";
import { tousLesExamens } from "./examens-blancs-data";

export type IssueSeverity = "error" | "warning";
export type IssueKind =
  | "qcm_no_correct"
  | "qcm_all_correct"
  | "qcm_duplicate_letter"
  | "qcm_missing_choices"
  | "qrc_missing_reponse"
  | "qrc_reponse_looks_like_question"
  | "answer_parity_mismatch";

export interface ConsistencyIssue {
  severity: IssueSeverity;
  kind: IssueKind;
  examId: string;
  examTitre: string;
  matiereId: string;
  matiereNom: string;
  questionId: number;
  enonce: string;
  message: string;
  detail?: string;
}

export interface QuestionParity {
  examId: string;
  matiereId: string;
  matiereNom: string;
  questionId: number;
  type: string;
  enonce: string;
  learnerExpected: string;
  adminExpected: string;
  match: boolean;
}

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// ─── Dérivations « miroir » des 2 côtés ────────────────────────────────
// Côté apprenant : le score compare les lettres cochées à
//   choix.filter(c => c.correct).map(c => c.lettre).sort()
// (cf. src/components/cours-en-ligne/__tests__/answerHelpers.ts:isAnswerCorrect)
export function computeLearnerExpected(q: Question): string {
  if (!q) return "";
  if (q.type === "QCM") {
    const letters = (q.choix || [])
      .filter((c) => c?.correct === true)
      .map((c) => String(c.lettre || "").toUpperCase().trim())
      .filter(Boolean)
      .sort();
    return letters.join("|");
  }
  if (q.type === "QRC") {
    const rep = (q.reponseQRC || "").trim();
    if (rep) return norm(rep);
    return (q.reponses_possibles || []).map(norm).filter(Boolean).sort().join(" / ");
  }
  return "";
}

// Côté admin : la correction affiche exactement les mêmes champs
// (cf. exam-helpers.ts:buildQuestionDetails → reponseCorrecte).
export function computeAdminExpected(q: Question): string {
  if (!q) return "";
  if (q.type === "QCM") {
    const letters = (q.choix || [])
      .filter((c) => c?.correct === true)
      .map((c) => String(c.lettre || "").toUpperCase().trim())
      .filter(Boolean)
      .sort();
    return letters.join("|");
  }
  if (q.type === "QRC") {
    const rep = (q.reponseQRC || "").trim();
    if (rep) return norm(rep);
    return (q.reponses_possibles || []).map(norm).filter(Boolean).sort().join(" / ");
  }
  return "";
}

function checkQuestion(
  exam: ExamenBlanc,
  matiere: Matiere,
  q: Question,
  outIssues: ConsistencyIssue[],
  outParities: QuestionParity[],
) {
  const base = {
    examId: exam.id,
    examTitre: exam.titre,
    matiereId: matiere.id,
    matiereNom: matiere.nom,
    questionId: q.id,
    enonce: q.enonce,
  };

  if (q.type === "QCM") {
    const choix = q.choix || [];
    if (choix.length < 2) {
      outIssues.push({ ...base, severity: "error", kind: "qcm_missing_choices",
        message: `QCM sans choix suffisants (${choix.length}).` });
    } else {
      const correct = choix.filter((c) => c.correct);
      if (correct.length === 0) {
        outIssues.push({ ...base, severity: "error", kind: "qcm_no_correct",
          message: "QCM sans bonne réponse marquée `correct: true` — l'apprenant ne peut jamais avoir de point ; l'admin n'affichera aucune coche verte." });
      } else if (correct.length === choix.length) {
        outIssues.push({ ...base, severity: "warning", kind: "qcm_all_correct",
          message: "Toutes les propositions sont marquées correctes — vérifier." });
      }
      const letters = new Set<string>();
      for (const c of choix) {
        const k = (c.lettre || "").toUpperCase();
        if (letters.has(k)) {
          outIssues.push({ ...base, severity: "warning", kind: "qcm_duplicate_letter",
            message: `Lettre en double : ${k}` });
        }
        letters.add(k);
      }
    }
  }

  if (q.type === "QRC") {
    const rep = (q.reponseQRC || "").trim();
    if (!rep) {
      outIssues.push({ ...base, severity: "error", kind: "qrc_missing_reponse",
        message: "QRC sans `reponseQRC` — l'admin affichera « Réponse attendue » vide, la correction IA n'aura rien à comparer." });
    } else if (/\?\s*$/.test(rep)) {
      outIssues.push({ ...base, severity: "error", kind: "qrc_reponse_looks_like_question",
        message: "`reponseQRC` se termine par « ? » — c'est probablement la question qui a été copiée à la place de la vraie réponse.",
        detail: rep.slice(0, 200) });
    } else if (norm(rep) === norm(q.enonce)) {
      outIssues.push({ ...base, severity: "error", kind: "qrc_reponse_looks_like_question",
        message: "`reponseQRC` est identique à l'énoncé — la réponse manque.",
        detail: rep.slice(0, 200) });
    }
  }

  // ─── Parité stricte apprenant ↔ admin ─────────────────────────────
  const learnerExpected = computeLearnerExpected(q);
  const adminExpected = computeAdminExpected(q);
  const match = learnerExpected === adminExpected;

  outParities.push({
    examId: exam.id,
    matiereId: matiere.id,
    matiereNom: matiere.nom,
    questionId: q.id,
    type: q.type || "?",
    enonce: q.enonce || "",
    learnerExpected,
    adminExpected,
    match,
  });

  if (!match) {
    outIssues.push({
      ...base,
      severity: "error",
      kind: "answer_parity_mismatch",
      message: "La bonne réponse calculée côté apprenant diffère de la réponse attendue affichée côté admin — l'élève sera noté sur une base différente de ce que l'admin voit.",
      detail: `apprenant = « ${learnerExpected || "∅"} » ≠ admin = « ${adminExpected || "∅"} »`,
    });
  }
}

export interface ExamConsistencyReport {
  examId: string;
  examTitre: string;
  totalQuestions: number;
  errors: number;
  warnings: number;
  parityChecked: number;
  parityMismatches: number;
  issues: ConsistencyIssue[];
  parities: QuestionParity[];
}

export function runExamensBlancsConsistencyCheck(
  examens: ExamenBlanc[] = tousLesExamens,
): { reports: ExamConsistencyReport[]; totalErrors: number; totalWarnings: number; totalParityMismatches: number } {
  const allIssues: ConsistencyIssue[] = [];
  const allParities: QuestionParity[] = [];
  for (const exam of examens) {
    for (const matiere of exam.matieres || []) {
      for (const q of matiere.questions || []) {
        if (!q) continue;
        checkQuestion(exam, matiere, q, allIssues, allParities);
      }
    }
  }

  const issuesByExam = new Map<string, ConsistencyIssue[]>();
  for (const i of allIssues) {
    const a = issuesByExam.get(i.examId) || [];
    a.push(i);
    issuesByExam.set(i.examId, a);
  }
  const paritiesByExam = new Map<string, QuestionParity[]>();
  for (const p of allParities) {
    const a = paritiesByExam.get(p.examId) || [];
    a.push(p);
    paritiesByExam.set(p.examId, a);
  }

  const reports: ExamConsistencyReport[] = examens.map((e) => {
    const issues = issuesByExam.get(e.id) || [];
    const parities = paritiesByExam.get(e.id) || [];
    const totalQuestions = (e.matieres || []).reduce(
      (acc, m) => acc + (m.questions?.length || 0),
      0,
    );
    return {
      examId: e.id,
      examTitre: e.titre,
      totalQuestions,
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      parityChecked: parities.length,
      parityMismatches: parities.filter((p) => !p.match).length,
      issues,
      parities,
    };
  });

  return {
    reports,
    totalErrors: reports.reduce((s, r) => s + r.errors, 0),
    totalWarnings: reports.reduce((s, r) => s + r.warnings, 0),
    totalParityMismatches: reports.reduce((s, r) => s + r.parityMismatches, 0),
  };
}
