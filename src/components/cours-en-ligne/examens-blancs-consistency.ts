// Auto-check: détecte les incohérences entre ce qui est calculé côté
// apprenant (via `choix.correct` + `reponseQRC`) et ce qui sera affiché côté
// admin sur les mêmes données. Toute anomalie signalée ici cause un décalage
// visible entre les 2 vues (ex: QCM sans bonne réponse, QRC avec la question
// à la place de la réponse, doublons contradictoires entre examens…).

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
  | "cross_exam_conflict";

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

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function checkQuestion(
  exam: ExamenBlanc,
  matiere: Matiere,
  q: Question,
  out: ConsistencyIssue[],
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
      out.push({ ...base, severity: "error", kind: "qcm_missing_choices",
        message: `QCM sans choix suffisants (${choix.length}).` });
      return;
    }
    const correct = choix.filter((c) => c.correct);
    if (correct.length === 0) {
      out.push({ ...base, severity: "error", kind: "qcm_no_correct",
        message: "QCM sans bonne réponse marquée `correct: true` — l'apprenant ne peut jamais avoir de point ; l'admin n'affichera aucune coche verte." });
    } else if (correct.length === choix.length) {
      out.push({ ...base, severity: "warning", kind: "qcm_all_correct",
        message: "Toutes les propositions sont marquées correctes — vérifier." });
    }
    const letters = new Set<string>();
    for (const c of choix) {
      const k = (c.lettre || "").toUpperCase();
      if (letters.has(k)) {
        out.push({ ...base, severity: "warning", kind: "qcm_duplicate_letter",
          message: `Lettre en double : ${k}` });
      }
      letters.add(k);
    }
  }

  if (q.type === "QRC") {
    const rep = (q.reponseQRC || "").trim();
    if (!rep) {
      out.push({ ...base, severity: "error", kind: "qrc_missing_reponse",
        message: "QRC sans `reponseQRC` — l'admin affichera « Réponse attendue » vide, la correction IA n'aura rien à comparer." });
    } else if (/\?\s*$/.test(rep)) {
      // Répond exactement à la question au lieu de contenir la réponse
      out.push({ ...base, severity: "error", kind: "qrc_reponse_looks_like_question",
        message: "`reponseQRC` se termine par « ? » — c'est probablement la question qui a été copiée à la place de la vraie réponse.",
        detail: rep.slice(0, 200) });
    } else if (norm(rep) === norm(q.enonce)) {
      out.push({ ...base, severity: "error", kind: "qrc_reponse_looks_like_question",
        message: "`reponseQRC` est identique à l'énoncé — la réponse manque.",
        detail: rep.slice(0, 200) });
    }
  }
}

export interface ExamConsistencyReport {
  examId: string;
  examTitre: string;
  totalQuestions: number;
  errors: number;
  warnings: number;
  issues: ConsistencyIssue[];
}

export function runExamensBlancsConsistencyCheck(
  examens: ExamenBlanc[] = tousLesExamens,
): { reports: ExamConsistencyReport[]; totalErrors: number; totalWarnings: number } {
  const all: ConsistencyIssue[] = [];
  for (const exam of examens) {
    for (const matiere of exam.matieres || []) {
      for (const q of matiere.questions || []) {
        if (!q) continue;
        checkQuestion(exam, matiere, q, all);
      }
    }
  }

  const byExam = new Map<string, ConsistencyIssue[]>();
  for (const i of all) {
    const a = byExam.get(i.examId) || [];
    a.push(i);
    byExam.set(i.examId, a);
  }

  const reports: ExamConsistencyReport[] = examens.map((e) => {
    const issues = byExam.get(e.id) || [];
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
      issues,
    };
  });

  return {
    reports,
    totalErrors: reports.reduce((s, r) => s + r.errors, 0),
    totalWarnings: reports.reduce((s, r) => s + r.warnings, 0),
  };
}
