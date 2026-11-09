import { excludeResultPlaceholders, mergePassageSiblingRows } from "@/components/cours-en-ligne/exam-helpers";
import { selectLatestAttemptRows } from "@/components/cours-en-ligne/examens-blancs-utils";
import { isAfterExamReset, latestExamResetCutoffs } from "@/lib/examResetCutoff";

/**
 * LIGNES D'EXAMEN BLANC AFFICHÉES — sélection commune à la carte élève et à la
 * fiche Résultats admin : remise à zéro respectée, lignes techniques écartées,
 * doublons d'un même passage fusionnés, puis tentative la plus récente par
 * examen (numéro de tentative enregistré, jamais une fenêtre de temps).
 * Lecture seule : aucune ligne n'est modifiée en base.
 */
export function lignesExamenAffichees<T extends Record<string, any>>(
  rows: T[] | null | undefined,
  resetRows: Array<{ exam_id?: string | null; cutoff_at?: string | null }> | null | undefined,
): T[] {
  const cutoffs = latestExamResetCutoffs(resetRows as any);
  const all = mergePassageSiblingRows(
    excludeResultPlaceholders(
      (rows || []).filter((row: any) =>
        isAfterExamReset(row?.completed_at ?? row?.created_at, cutoffs[String(row?.quiz_id ?? "")]),
      ),
    ),
  ) as T[];
  const byQuiz = new Map<string, T[]>();
  all.forEach((row: any) => {
    if (!row?.quiz_id) return;
    if (!byQuiz.has(row.quiz_id)) byQuiz.set(row.quiz_id, []);
    byQuiz.get(row.quiz_id)!.push(row);
  });
  return Array.from(byQuiz.values()).flatMap((list) => selectLatestAttemptRows(list as any[]) as T[]);
}
