/** Display-only boundary: never infer a V2 linkage from dates or answer text. */
export function eb2HistoriqueNonCopie(result: { id: string; quiz_id: string; completed_at?: string | null }, copiedIds: ReadonlySet<string>) {
  return result.quiz_id === "EB2" && !!result.completed_at && !copiedIds.has(result.id);
}

export function memePassageEb2(a: { id: string; tentative?: number | null }, b: { id: string; tentative?: number | null }) {
  return a.id === b.id || (a.tentative != null && b.tentative != null && a.tentative === b.tentative);
}