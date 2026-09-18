// JOURNAL DES MODIFICATIONS ADMIN DES EXAMENS BLANCS
//
// Trace uniquement les FUTURES modifications faites dans Gestion :
// date/heure, Admin, filière, numéro d'examen, matière, question, type d'action,
// ancienne valeur et nouvelle valeur.
//
// ⚠️ Aucune donnée pédagogique n'est modifiée par ce module, aucun mot de passe
// n'est enregistré, et un échec d'écriture du journal ne bloque jamais la
// sauvegarde du contenu.

import { supabase } from "@/integrations/supabase/client";
import { getExamIdentity } from "./examens-blancs-sync-scope";
import type { ExamenBlanc, Matiere, Question } from "./examens-blancs-data";

export type ExamAuditAction =
  | "ajout_question"
  | "suppression_question"
  | "modification_question"
  | "changement_type";

export interface ExamAuditEntry {
  exam_id: string;
  filiere: string;
  numero_examen: number | null;
  matiere_id: string;
  matiere_nom: string | null;
  question_id: string | null;
  action: ExamAuditAction;
  ancienne_valeur: unknown;
  nouvelle_valeur: unknown;
}

const questionSnapshot = (q: any) =>
  q
    ? {
        id: q.id ?? null,
        type: q.type ?? null,
        enonce: q.enonce ?? null,
        choix: Array.isArray(q.choix)
          ? q.choix.map((c: any) => ({ lettre: c?.lettre ?? null, texte: c?.texte ?? null, correct: c?.correct === true }))
          : null,
        reponseQRC: q.reponseQRC ?? null,
        explication: q.explication ?? null,
        image: q.image ?? null,
      }
    : null;

const sameQuestion = (a: any, b: any) =>
  JSON.stringify(questionSnapshot(a)) === JSON.stringify(questionSnapshot(b));

/** Compare deux versions d'une matière et produit les entrées de journal (lecture seule). */
export function diffMatiereForAudit(
  examId: string,
  before: Matiere | null | undefined,
  after: Matiere,
): ExamAuditEntry[] {
  const identity = getExamIdentity(examId);
  const base = {
    exam_id: examId,
    filiere: identity.filiere,
    numero_examen: identity.numero,
    matiere_id: after?.id ?? before?.id ?? "",
    matiere_nom: after?.nom ?? before?.nom ?? null,
  };

  const beforeQs: Question[] = Array.isArray(before?.questions) ? (before!.questions as Question[]) : [];
  const afterQs: Question[] = Array.isArray(after?.questions) ? (after.questions as Question[]) : [];
  const beforeById = new Map(beforeQs.map((q: any) => [String(q?.id), q]));
  const afterById = new Map(afterQs.map((q: any) => [String(q?.id), q]));

  const entries: ExamAuditEntry[] = [];

  afterQs.forEach((q: any) => {
    const prev = beforeById.get(String(q?.id));
    if (!prev) {
      entries.push({ ...base, question_id: String(q?.id ?? ""), action: "ajout_question", ancienne_valeur: null, nouvelle_valeur: questionSnapshot(q) });
      return;
    }
    if (sameQuestion(prev, q)) return;
    const typeChanged = String(prev?.type ?? "").toUpperCase() !== String(q?.type ?? "").toUpperCase();
    entries.push({
      ...base,
      question_id: String(q?.id ?? ""),
      action: typeChanged ? "changement_type" : "modification_question",
      ancienne_valeur: questionSnapshot(prev),
      nouvelle_valeur: questionSnapshot(q),
    });
  });

  beforeQs.forEach((q: any) => {
    if (afterById.has(String(q?.id))) return;
    entries.push({ ...base, question_id: String(q?.id ?? ""), action: "suppression_question", ancienne_valeur: questionSnapshot(q), nouvelle_valeur: null });
  });

  return entries;
}

/** Écrit les entrées dans le journal — best effort, jamais bloquant. */
export async function recordExamAuditEntries(entries: ExamAuditEntry[]): Promise<void> {
  if (!entries.length) return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const rows = entries.slice(0, 500).map((e) => ({
      ...e,
      ancienne_valeur: e.ancienne_valeur as any,
      nouvelle_valeur: e.nouvelle_valeur as any,
      author_user_id: userData?.user?.id ?? null,
      author_email: userData?.user?.email ?? null,
    }));
    const { error } = await supabase.from("examens_blancs_audit_log" as any).insert(rows as any);
    if (error) console.warn("[ExamAudit] Journal non enregistré:", error.message);
  } catch (err) {
    console.warn("[ExamAudit] Journal non enregistré:", err);
  }
}

export type { ExamenBlanc };
