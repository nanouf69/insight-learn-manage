import { supabase } from "@/integrations/supabase/client";
import type { Matiere, Question } from "@/components/cours-en-ligne/examens-blancs-data";
import { reponseExacte } from "./bilanFutureCorrection";

export type CorrigeSource = {
  source_type: "attempt" | "result"; source_id: string; exam_id: string; question_id: string;
  historique: Question; actuelle: Question | null; version: number | null;
  publiee_le: string | null; statut: "rapproche" | "non_rapproche";
};
export type CarteSources = Map<string, CorrigeSource>;
export const cleSource = (type: string, id: string, question: string) => `${type}|${id}|${question}`;
export function indexerSources(data: unknown): CarteSources {
  if (!Array.isArray(data)) throw new Error("Réponse de lecture des corrigés invalide");
  const map: CarteSources = new Map();
  for (const row of data as CorrigeSource[]) {
    if (!row?.source_id || !row.question_id || !["attempt", "result"].includes(row.source_type)) throw new Error("Identité du corrigé invalide");
    const key = cleSource(row.source_type, row.source_id, row.question_id);
    if (map.has(key)) throw new Error("Identité de question ambiguë");
    map.set(key, row);
  }
  return map;
}
export async function lireSources(attempts: string[], results: string[]): Promise<CarteSources> {
  const refs = [...new Set(attempts)].map(id => ({ type: "attempt", id }))
    .concat([...new Set(results)].map(id => ({ type: "result", id })));
  const map: CarteSources = new Map();
  for (let i = 0; i < refs.length; i += 50) {
    const batch = refs.slice(i, i + 50);
    const { data, error } = await supabase.rpc("corriges_officiels_sources" as never, {
      p_attempt_ids: batch.filter(r => r.type === "attempt").map(r => r.id),
      p_result_ids: batch.filter(r => r.type === "result").map(r => r.id),
    } as never);
    if (error) throw error;
    for (const [key, value] of indexerSources(data)) map.set(key, value);
  }
  return map;
}
export function sourcePour(map: CarteSources, result: {resultId?: string; __core?: {attemptId?: string} | null}, matiere: string, qid: string | number) {
  const question = String(qid).startsWith(`${matiere}:`) ? String(qid) : `${matiere}:${qid}`;
  return (result.__core?.attemptId ? map.get(cleSource("attempt", result.__core.attemptId, question)) : undefined)
    ?? (result.resultId ? map.get(cleSource("result", result.resultId, question)) : undefined) ?? null;
}
/** Live keys are used ONLY for pedagogical review, never for historical grade computation. */
export function matierePedagogique(m: Matiere, result: {resultId?: string; __core?: {attemptId?: string} | null}, map: CarteSources): Matiere {
  return {...m, questions: m.questions.map(q => {
    const source = sourcePour(map, result, m.id, q.id);
    return source?.actuelle ? {...q, choix: source.actuelle.choix, reponseQRC: source.actuelle.reponseQRC, reponses_possibles: source.actuelle.reponses_possibles} : q;
  })};
}
export function statutPedagogique(source: CorrigeSource, answer: unknown): "juste" | "fausse" | "à vérifier" {
  if (!source.actuelle || source.actuelle.type !== "QCM") return "à vérifier";
  return reponseExacte(answer, (source.actuelle.choix ?? []).filter(c => c.correct).map(c => c.lettre)) ? "juste" : "fausse";
}