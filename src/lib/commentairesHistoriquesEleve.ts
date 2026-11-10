import { supabase } from "@/integrations/supabase/client";

export interface CommentaireHistorique {
  result_id: string;
  question_id: string;
  note: number;
  commentaire: string | null;
  revision: number;
}

export const cleCommentaireHistorique = (resultId: string, questionId: string | number) => `${resultId}:${String(questionId)}`;

/** Dernière ligne du journal par copie+question, lue côté serveur pour le seul propriétaire (ou un admin). */
export async function lireCommentairesHistoriques(resultIds: string[]): Promise<Map<string, CommentaireHistorique>> {
  const ids = Array.from(new Set(resultIds.filter(Boolean))).sort();
  const map = new Map<string, CommentaireHistorique>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await (supabase as any).rpc("qrc_historique_commentaires_eleve", { p_result_ids: ids.slice(i, i + 150) });
    if (error) throw error;
    for (const r of (data ?? []) as CommentaireHistorique[]) map.set(cleCommentaireHistorique(r.result_id, r.question_id), r);
  }
  return map;
}

/**
 * Commentaire affiché au candidat pour une ancienne copie : la dernière ligne du journal fait foi
 * uniquement si elle porte la note actuellement enregistrée ; sinon le commentaire de la copie reste affiché.
 */
export function commentaireHistoriqueAffiche(
  journal: Map<string, CommentaireHistorique> | null,
  resultId: string | null | undefined,
  questionId: string | number,
  correction: { pointsObtenus?: number | null; commentaire?: string | null } | null | undefined,
): string | null {
  const local = correction?.commentaire ?? null;
  if (!journal || !resultId || correction?.pointsObtenus == null) return local;
  const ligne = journal.get(cleCommentaireHistorique(resultId, questionId));
  if (!ligne || Number(ligne.note) !== Number(correction.pointsObtenus)) return local;
  return ligne.commentaire ?? null;
}
