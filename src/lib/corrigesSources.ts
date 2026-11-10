import { supabase } from "@/integrations/supabase/client";
import type { Matiere, Question } from "@/components/cours-en-ligne/examens-blancs-data";
import { reponseExacte } from "./bilanFutureCorrection";

export type SourceType = "attempt" | "result" | "bilan_snapshot" | "bilan_future";
export const SOURCE_TYPES: readonly SourceType[] = ["attempt", "result", "bilan_snapshot", "bilan_future"];
export type RaisonNonRapproche =
  | "copie_non_terminee" | "sans_snapshot" | "matiere_ambigue" | "sans_publication" | "exercice_absent"
  | "identite_ambigue" | "question_absente" | "contenu_modifie" | "sans_bonne_reponse" | "type_inconnu";
export type Provenance = {kind: "publication" | "editeur" | "bilan_future"; date?: string | null; version?: number | null; version_id?: string | null; empreinte?: string | null; module_id?: number; exercice_id?: number};
export type CorrigeSource = {
  source_type: SourceType; source_id: string; exam_id: string; question_id: string;
  circuit?: "eb" | "bilan_historique" | "bilan_futur"; tentative?: number | null; position?: number | null;
  historique: Question; actuelle: Question | null; version: number | null; reponse_initiale?: unknown;
  publiee_le: string | null; provenance?: Provenance; statut: "rapproche" | "non_rapproche"; raison?: RaisonNonRapproche | null;
};
/** Copy-level refusal: nothing about its questions can be proven (never a guessed key). */
export type CopieNonRapprochee = {source_type: SourceType; source_id: string; exam_id: string; circuit?: string; tentative?: number | null; question_id: null; statut: "non_rapproche"; raison: RaisonNonRapproche};
export type CarteSources = Map<string, CorrigeSource>;
export const cleSource = (type: string, id: string, question: string) => `${type}|${id}|${question}`;

export const LIBELLES_RAISONS: Record<RaisonNonRapproche, string> = {
  copie_non_terminee: "copie non terminée ou non remise",
  sans_snapshot: "ancienne copie sans questions figées",
  matiere_ambigue: "matière de la copie non déterminée",
  sans_publication: "aucun corrigé officiel publié pour cet examen",
  exercice_absent: "exercice absent de l'éditeur",
  identite_ambigue: "identité de question ambiguë",
  question_absente: "question absente du corrigé actuel",
  contenu_modifie: "énoncé ou propositions modifiés depuis la copie",
  sans_bonne_reponse: "corrigé actuel sans bonne réponse",
  type_inconnu: "type de question inconnu",
};

function verifierLigne(row: CorrigeSource | CopieNonRapprochee) {
  if (!row?.source_id || !SOURCE_TYPES.includes(row.source_type) || !["rapproche", "non_rapproche"].includes(row.statut)) throw new Error("Identité du corrigé invalide");
  if (row.statut === "rapproche" && (!row.question_id || !(row as CorrigeSource).actuelle || row.raison)) throw new Error("Rapprochement non prouvé");
}
export function indexerSources(data: unknown): CarteSources {
  return separerSources(data).questions;
}
export function separerSources(data: unknown): {questions: CarteSources; copies: CopieNonRapprochee[]} {
  if (!Array.isArray(data)) throw new Error("Réponse de lecture des corrigés invalide");
  const questions: CarteSources = new Map(); const copies: CopieNonRapprochee[] = [];
  for (const row of data as (CorrigeSource | CopieNonRapprochee)[]) {
    verifierLigne(row);
    if (row.question_id === null) { copies.push(row as CopieNonRapprochee); continue; }
    const key = cleSource(row.source_type, row.source_id, row.question_id);
    if (questions.has(key)) throw new Error("Identité de question ambiguë");
    questions.set(key, row as CorrigeSource);
  }
  return {questions, copies};
}
export async function lireSources(attempts: string[], results: string[]): Promise<CarteSources> {
  const copies: {type: SourceType; id: string}[] = [
    ...[...new Set(attempts)].map(id => ({type: "attempt" as const, id})),
    ...[...new Set(results)].map(id => ({type: "result" as const, id})),
  ];
  return (await lireSourcesCopies(copies)).questions;
}
/** Exhaustive bounded reads: 50 copies per call, every copy must come back (question or copy-level row). */
export async function lireSourcesCopies(copies: {type: SourceType; id: string}[]) {
  const unique = [...new Map(copies.map(c => [`${c.type}|${c.id}`, c])).values()];
  const questions: CarteSources = new Map(); const refusees: CopieNonRapprochee[] = []; const vues = new Set<string>();
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const {data, error} = await supabase.rpc("corriges_sources_v2" as never, {p_copies: batch} as never);
    if (error) throw error;
    const part = separerSources(data);
    for (const [k, v] of part.questions) { if (questions.has(k)) throw new Error("Identité de question ambiguë"); questions.set(k, v); vues.add(`${v.source_type}|${v.source_id}`); }
    for (const c of part.copies) { refusees.push(c); vues.add(`${c.source_type}|${c.source_id}`); }
  }
  // A copy absent from the answer is inaccessible: reported, never silently dropped.
  const inaccessibles = unique.filter(c => !vues.has(`${c.type}|${c.id}`));
  return {questions, copies: refusees, inaccessibles};
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
  if (!source.actuelle) return "à vérifier";
  if (source.actuelle.type === "QCM") return reponseExacte(answer, (source.actuelle.choix ?? []).filter(c => c.correct).map(c => c.lettre)) ? "juste" : "fausse";
  return typeof answer === "string" && answer.length > 0 && answer === source.actuelle.reponseQRC ? "juste" : "à vérifier";
}
/** Questions to redo = proven questions whose initial answer is not perfect under the CURRENT official key. */
export function questionsARefaire(sources: Iterable<CorrigeSource>) {
  const refaire: CorrigeSource[] = []; const nonRapprochees: CorrigeSource[] = [];
  for (const s of sources) {
    if (s.statut !== "rapproche" || !s.actuelle) { nonRapprochees.push(s); continue; }
    if (statutPedagogique(s, s.reponse_initiale) !== "juste") refaire.push(s);
  }
  const ordre = (a: CorrigeSource, b: CorrigeSource) => a.source_id.localeCompare(b.source_id) || (a.position ?? 0) - (b.position ?? 0);
  return {refaire: refaire.sort(ordre), nonRapprochees: nonRapprochees.sort(ordre)};
}
export function bonnesReponses(q: Question | null | undefined) {
  if (!q) return "";
  return q.type === "QCM" ? (q.choix ?? []).filter(c => c.correct).map(c => c.lettre).sort().join(" + ") : (q.reponseQRC ?? "");
}
export function provenanceTexte(s: Pick<CorrigeSource, "provenance" | "version" | "publiee_le">) {
  const d = s.provenance?.date ?? s.publiee_le;
  const quand = d ? new Date(d).toLocaleString("fr-FR", {timeZone: "Europe/Paris"}) : "date inconnue";
  if (s.provenance?.kind === "editeur") return `éditeur du Bilan, enregistré le ${quand}`;
  if (s.provenance?.kind === "bilan_future") return `version de Bilan active du ${quand}`;
  return `version publiée ${s.version ?? "?"} du ${quand}`;
}
