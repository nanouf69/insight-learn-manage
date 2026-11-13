/** Candidate only: no production RPC is called until the journal and all readers are approved. */
export const PRESENCE_REVOCATIONS_ACTIVE = false;
/** Technical audit label, never a justification requested from the administrator. */
export const AUDIT_REVOCATION_PRESENCE = 'Révocation confirmée par l’administration';
export interface PresenceDecision {
  id: string; validation_id: string; apprenant_id: string; version: number;
  action: 'annuler' | 'restaurer'; motif: string; created_at: string; created_by: string;
}
export function projeterDecisionsPresence<T extends { id?: string; annulee?: boolean }>(rows: readonly T[], decisions: readonly PresenceDecision[], apprenantId: string) {
  const latest = new Map<string, PresenceDecision>();
  for (const d of decisions) {
    if (d.apprenant_id !== apprenantId) throw new Error('Journal d’un autre dossier : lecture refusée');
    const prev = latest.get(d.validation_id);
    if (prev?.version === d.version && prev.id !== d.id) throw new Error('Journal contradictoire : revue requise');
    if (!prev || d.version > prev.version) latest.set(d.validation_id, d);
  }
  return rows.map(r => {
    const decision = r.id ? latest.get(r.id) : undefined;
    return { ...r, annulee: decision ? decision.action === 'annuler' : r.annulee === true, versionDecision: decision?.version ?? 0, decision };
  });
}
export interface PresenceDecisionCommande {
  operationId: string; apprenantId: string; validationId: string; version: number;
  action: 'annuler' | 'restaurer'; motif: string;
}
/** One pending command per controller; server still checks roles, CAS and idempotency. */
export function creerControleDecisionPresence(transport: (c: PresenceDecisionCommande) => Promise<PresenceDecision>) {
  let pending: Promise<PresenceDecision> | null = null;
  let key = '';
  return (c: PresenceDecisionCommande) => {
    if (c.action === 'annuler') c = { ...c, motif: AUDIT_REVOCATION_PRESENCE };
    const next = JSON.stringify(c);
    if (pending) return key === next ? pending : Promise.reject(new Error('Une autre décision est en cours'));
    if (c.action === 'restaurer' && c.motif.trim().length < 5) return Promise.reject(new Error('Motif précis requis'));
    key = next;
    pending = transport(c).then(d => {
      if (d.validation_id !== c.validationId || d.apprenant_id !== c.apprenantId || d.action !== c.action || d.version !== c.version + 1) throw new Error('Décision non confirmée : relire le journal');
      return d;
    }).finally(() => { pending = null; key = ''; });
    return pending;
  };
}