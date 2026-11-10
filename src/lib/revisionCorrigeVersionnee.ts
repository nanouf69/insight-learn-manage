import { supabase } from "@/integrations/supabase/client";
import type { CorrigeSource } from "./corrigesSources";

export type RevisionRef = {type: "attempt" | "result"; id: string; question: string};
export type RevisionVersionnee = {
  id: string; owner_id: string; seq: number; epoch: string;
  sources: CorrigeSource[]; answers: Record<string, unknown>;
  submission: null | {perfect: number; total: number; qrc_a_verifier: number; note_examen_modifiee: false};
};
export type RevisionCommande = {kind: "answer"; key: string; answer: unknown} | {kind: "submit"};
export function lireEtatRevision(data: unknown, owner: string, session?: string): RevisionVersionnee {
  const row = data as RevisionVersionnee | null;
  if (!row || row.owner_id !== owner || !row.id || (session && row.id !== session)
    || !Number.isSafeInteger(row.seq) || row.seq < 0 || typeof row.epoch !== "string"
    || !Array.isArray(row.sources) || !row.answers || Array.isArray(row.answers)) {
    throw new Error("Identité de révision non confirmée");
  }
  return row;
}
export async function ouvrirRevisionVersionnee(owner: string, refs: RevisionRef[]) {
  const {data,error} = await supabase.rpc("revision_corrige_ouvrir" as never, {p_owner:owner,p_refs:refs} as never);
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