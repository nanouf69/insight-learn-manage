import { supabase } from "@/integrations/supabase/client";
import { projeterRevisionsAdmin, type RevisionServeur, type SourceRevision, type EvenementRevision } from "./revisionsAdmin";

async function pages<T>(query: () => any): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const {data,error} = await query().order("id").range(start,start+499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < 500) return rows;
  }
}
export async function lireRevisionsAdmin(apprenantId: string) {
  const revisions = await pages<RevisionServeur>(() => supabase.from("reponses_apprenants").select("id,apprenant_id,exercice_id,reponses,updated_at,completed,originaux_exacts,reponses_meta").eq("apprenant_id",apprenantId).eq("exercice_type","revision_fausses"));
  // Journaux par identité de révision, jamais la totalité des événements de tous les élèves.
  const events: EvenementRevision[] = [];
  for (const r of revisions) events.push(...await pages<EvenementRevision>(() => supabase.from("reponses_apprenants_journal").select("id,apprenant_id,exercice_id,question_id,created_at,valeur,valeur_originale").eq("apprenant_id",apprenantId).eq("exercice_id",r.exercice_id).eq("exercice_type","revision_fausses")));
  const sources = await pages<SourceRevision>(() => supabase.from("apprenant_quiz_results").select("id,apprenant_id,quiz_id,matiere_id,matiere_nom,tentative,details").eq("apprenant_id",apprenantId).ilike("quiz_id","eb%"));
  return projeterRevisionsAdmin(apprenantId,revisions,sources,events);
}