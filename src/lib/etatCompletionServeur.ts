import { supabase } from "@/integrations/supabase/client";
import type { CompletionEvidenceRow } from "@/lib/moduleCompletionEvidence";

/** Ligne de `etat_completion_modules` : verdict serveur unique (même RLS que la lecture des modules). */
export interface EtatCompletionServeur {
  module_id: number;
  status: string | null;
  completed_at: string | null;
  questions_requises: number;
  questions_prouvees: number;
  preuve_complete: boolean | null;
  status_effectif: string | null;
  progress_effectif: number | null;
}

/** Lecture seule. Une erreur est remontée : jamais de repli silencieux vers un faux « terminé ». */
export async function chargerEtatCompletionServeur(apprenantId: string): Promise<Map<number, EtatCompletionServeur>> {
  const { data, error } = await (supabase as any).rpc("etat_completion_modules", { _apprenant_id: apprenantId });
  if (error) throw error;
  return new Map(((data ?? []) as EtatCompletionServeur[]).map(r => [Number(r.module_id), r]));
}

/**
 * Attache le verdict serveur à une ligne persistée, sans modifier statut, date, réponses ni notes.
 * Ligne absente du verdict (écrite entre les deux lectures) : aucun verdict, la prochaine relecture tranche.
 */
export function avecEtatServeur<T extends CompletionEvidenceRow>(row: T, etats: ReadonlyMap<number, EtatCompletionServeur>): T {
  const etat = etats.get(Number(row.module_id));
  if (!etat || (etat.status ?? null) !== (row.status ?? null)) return row;
  return {
    ...row,
    preuve_serveur: etat.preuve_complete,
    progress_preuve: etat.progress_effectif == null ? null : Number(etat.progress_effectif),
  };
}
