import { supabase } from "@/integrations/supabase/client";

export type ExamResetArchiveRow = {
  exam_id?: string | null;
  cutoff_at?: string | null;
  archived_legacy_result_ids?: unknown;
};

/** IDs historiques exclus de l'affichage, jamais supprimés de la base. */
export function idsResultatsLegacyArchives(rows: ExamResetArchiveRow[] | null | undefined): Set<string> {
  const ids = new Set<string>();
  for (const row of rows ?? []) {
    if (!Array.isArray(row?.archived_legacy_result_ids)) continue;
    for (const id of row.archived_legacy_result_ids) {
      if (typeof id === "string" && id) ids.add(id);
    }
  }
  return ids;
}

/**
 * Remise à zéro administrative complète : uniquement la procédure officielle
 * d'archivage. Aucun résultat, brouillon, score ou passage n'est supprimé ici.
 */
export async function archiverExamenBlancAdmin(params: {
  apprenantId: string;
  examIds: string[];
  motif: string;
  adminEmail?: string | null;
}): Promise<string[]> {
  const resetIds: string[] = [];
  for (const examId of [...new Set(params.examIds.filter(Boolean))]) {
    const { data, error } = await supabase.rpc("core_admin_reset_exam", {
      p_operation_id: crypto.randomUUID(),
      p_apprenant_id: params.apprenantId,
      p_exam_id: examId,
      p_motif: params.motif,
      p_admin_email: params.adminEmail ?? null,
    });
    if (error) throw error;
    const resetId = (data as { reset_id?: string } | null)?.reset_id;
    if (!resetId) throw new Error(`Archivage non confirmé pour ${examId}`);
    resetIds.push(resetId);
  }
  return resetIds;
}
