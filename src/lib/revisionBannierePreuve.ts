import { canonique } from "./originauxExacts";
import { revisionResultatConfirme } from "./revisionFinalisationPreuve";
type Row = Record<string, any>;
/** Read-only reconciliation: missing result metadata may be supplied by its EXACT linked persisted revision, never by time or name. */
export function revisionBanniereConfirmee(result: Row, draft: Row | undefined, owner: string, exam: string, expected: Record<string, string>): boolean {
  const order = Object.keys(expected);
  if (!draft || !order.length || draft.apprenant_id !== owner || draft.exercice_type !== "revision_fausses"
    || draft.completed !== true || result.details?.revision_exercice_id !== draft.exercice_id) return false;
  const state = draft.reponses?.revisionState;
  if (!state || !Array.isArray(state.questionOrder) || canonique(state.questionOrder) !== canonique(order)) return false;
  const sources = result.details?.sourceResultIds ?? state.sourceResultIds;
  if (!sources || canonique(sources) !== canonique(expected)) return false;
  // If both exist they must agree: never conceal contradictory provenance.
  if (result.details?.sourceResultIds && state.sourceResultIds && canonique(result.details.sourceResultIds) !== canonique(state.sourceResultIds)) return false;
  return revisionResultatConfirme(result, owner, exam, draft.exercice_id, draft.reponses, order, Number(draft.score));
}
export async function lireBanniereRevision(client: any, owner: string, exam: string, expected: Record<string, string>): Promise<boolean> {
  const results: Row[] = [], drafts: Row[] = [];
  for (const [table, target] of [["apprenant_quiz_results", results], ["reponses_apprenants", drafts]] as const) {
    for (let start = 0; ; start += 100) {
      let q = client.from(table).select(table === "apprenant_quiz_results" ? "id,apprenant_id,quiz_id,quiz_type,score_obtenu,score_max,details" : "id,apprenant_id,exercice_id,exercice_type,completed,reponses,score").eq("apprenant_id", owner);
      q = table === "apprenant_quiz_results" ? q.eq("quiz_type", "revision_fausses").eq("quiz_id", exam) : q.eq("exercice_type", "revision_fausses").eq("completed", true).like("exercice_id", `revision_fausses_${exam}%`);
      const { data, error } = await q.order("id").range(start, start + 99);
      if (error) throw new Error("Achèvement des questions fausses non relu : réessayez");
      target.push(...(data ?? [])); if (!data || data.length < 100) break;
    }
  }
  return results.some(r => revisionBanniereConfirmee(r, drafts.find(d => d.exercice_id === r.details?.revision_exercice_id), owner, exam, expected));
}