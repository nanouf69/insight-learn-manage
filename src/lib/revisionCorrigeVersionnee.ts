import { supabase } from "@/integrations/supabase/client";
import { SOURCE_TYPES, type CorrigeSource, type SourceType } from "./corrigesSources";

export type RevisionRef = {type: SourceType; id: string; question: string};
export type SauvegardeRevision = {seq: number; saved_at: string; statut: "juste" | "fausse" | "a_verifier"; corrige?: {version: number | null; bonnes: unknown}};
export type RevisionVersionnee = {
  id: string; owner_id: string; seq: number; epoch: string;
  sources: CorrigeSource[]; answers: Record<string, unknown>; saved?: Record<string, SauvegardeRevision>;
  submission: null | {perfect: number; total: number; qrc_a_verifier: number; note_examen_modifiee: false; submitted_at?: string};
};
export type RevisionCommande = {kind: "answer"; key: string; answer: unknown} | {kind: "submit"};
/** Server limit per revision session; larger sets are split into explicit lots, never truncated. */
export const REVISION_LOT_MAX = 400;

export function normaliserRefs(refs: RevisionRef[]): RevisionRef[] {
  const seen = new Set<string>(); const out: RevisionRef[] = [];
  for (const r of refs) {
    if (!SOURCE_TYPES.includes(r.type) || !r.id || !r.question) throw new Error("Identité de question invalide");
    const k = `${r.type}|${r.id}|${r.question}`;
    if (seen.has(k)) continue; seen.add(k); out.push({type: r.type, id: r.id, question: r.question});
  }
  return out.sort((a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id) || a.question.localeCompare(b.question));
}
/** Lots keep every question of one copy together whenever the copy fits in a lot. */
export function decouperLots(refs: RevisionRef[], max = REVISION_LOT_MAX): RevisionRef[][] {
  const lots: RevisionRef[][] = []; let cur: RevisionRef[] = [];
  const parCopie = new Map<string, RevisionRef[]>();
  for (const r of normaliserRefs(refs)) { const k = `${r.type}|${r.id}`; parCopie.set(k, [...(parCopie.get(k) ?? []), r]); }
  for (const groupe of parCopie.values()) {
    if (cur.length + groupe.length > max && cur.length) { lots.push(cur); cur = []; }
    for (const r of groupe) { if (cur.length === max) { lots.push(cur); cur = []; } cur.push(r); }
  }
  if (cur.length) lots.push(cur);
  return lots;
}
export function lireEtatRevision(data: unknown, owner: string, session?: string): RevisionVersionnee {
  const row = data as RevisionVersionnee | null;
  if (!row || row.owner_id !== owner || !row.id || (session && row.id !== session)
    || !Number.isSafeInteger(row.seq) || row.seq < 0 || typeof row.epoch !== "string"
    || !Array.isArray(row.sources) || !row.answers || Array.isArray(row.answers)) {
    throw new Error("Identité de révision non confirmée");
  }
  return row;
}
export function codeErreur(e: unknown): string | null {
  const err = e as {code?: string; message?: string} | null;
  if (err?.code && /^P05\d\d$/.test(err.code)) return err.code;
  const m = String(err?.message ?? "");
  if (m.includes("Conflit de version")) return "P0555";
  if (m.includes("Corrige modifie")) return "P0556";
  if (m.includes("deja remise")) return "P0554";
  return err?.code ?? null;
}
export async function ouvrirRevisionVersionnee(owner: string, refs: RevisionRef[]) {
  const {data,error} = await supabase.rpc("revision_corrige_ouvrir" as never, {p_owner:owner,p_refs:normaliserRefs(refs)} as never);
  if (error) throw error;
  return lireEtatRevision(data,owner);
}
export async function relireRevisionVersionnee(owner: string, session: string) {
  const {data,error} = await supabase.rpc("revision_corrige_etat" as never, {p_session:session} as never);
  if (error) throw error;
  return lireEtatRevision(data,owner,session);
}
/** Retry only with the same operation/payload; a CAS refusal must not be silently rebased. */
export async function commanderRevisionVersionnee(state: RevisionVersionnee, payload: RevisionCommande, operation: string) {
  const {data,error} = await supabase.rpc("revision_corrige_commande" as never,
    {p_session:state.id,p_seq:state.seq,p_epoch:state.epoch,p_operation:operation,p_payload:payload} as never);
  if (error) throw error;
  return lireEtatRevision(data,state.owner_id,state.id);
}
const egal = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
/**
 * After a CAS refusal, a local answer may be re-sent on the fresh state ONLY when the server
 * answer for that question is still the one the local edit started from (another tab changed
 * other questions). Otherwise both versions are kept and the learner chooses.
 */
export function decisionApresConflit(fresh: RevisionVersionnee, key: string, base: unknown, local: unknown): "renvoyer" | "deja_identique" | "conflit" {
  const server = fresh.answers[key];
  if (egal(server, local)) return "deja_identique";
  return egal(server, base) ? "renvoyer" : "conflit";
}
