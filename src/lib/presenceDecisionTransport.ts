import { supabase } from '@/integrations/supabase/client';
import { PRESENCE_REVOCATIONS_ACTIVE, type PresenceDecision, type PresenceDecisionCommande } from './presenceRevocations';

export async function lireJournalPresence(apprenantId: string): Promise<PresenceDecision[]> {
  const rows: PresenceDecision[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await supabase.from('presentiel_validation_decisions' as any)
      .select('*').eq('apprenant_id', apprenantId).order('id').range(from, from + 999);
    if (error) throw error;
    const page = (data ?? []) as unknown as PresenceDecision[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
  throw new Error('Journal incomplet : calcul refusé');
}

/** Installation gate; never call a mutation automatically or after an uncertain response. */
export async function envoyerDecisionPresence(c: PresenceDecisionCommande): Promise<PresenceDecision> {
  if (!PRESENCE_REVOCATIONS_ACTIVE) throw new Error('Annulation non mise en service');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Session expirée');
  const { data, error } = await (supabase.rpc as any)('presentiel_decider_validation', {
    p_operation: c.operationId, p_apprenant: c.apprenantId, p_validation: c.validationId,
    p_version: c.version, p_action: c.action, p_motif: c.motif,
  });
  if (error) throw error;
  const receipt = (Array.isArray(data) ? data[0] : data) as PresenceDecision | undefined;
  if (!receipt || receipt.created_by !== auth.user.id) throw new Error('Auteur non confirmé');
  const journal = await lireJournalPresence(c.apprenantId);
  const confirmed = journal.find(d => d.id === receipt.id);
  if (!confirmed || confirmed.validation_id !== c.validationId || confirmed.action !== c.action || confirmed.version !== c.version + 1)
    throw new Error('Décision non relue : actualisation requise');
  return confirmed;
}