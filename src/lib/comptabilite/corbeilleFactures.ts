export interface TraceCorbeilleFacture {
  id: string;
  facture_id: string | null;
  numero: string;
  client_nom: string | null;
  montant_ttc: number | null;
  date_emission: string | null;
  deleted_at: string | null;
  deleted_by_email: string | null;
  motif: string | null;
  snapshot: unknown;
}

interface EvenementCorbeille {
  version: 1;
  action: 'supprimer' | 'remettre';
  suppression_id?: string;
}

export function evenementCorbeille(trace: TraceCorbeilleFacture): EvenementCorbeille | null {
  if (!trace.snapshot || typeof trace.snapshot !== 'object') return null;
  const meta = (trace.snapshot as Record<string, unknown>)._corbeille;
  if (!meta || typeof meta !== 'object') return null;
  const m = meta as Record<string, unknown>;
  if (m.version !== 1 || (m.action !== 'supprimer' && m.action !== 'remettre')) return null;
  if (m.action === 'remettre' && typeof m.suppression_id !== 'string') return null;
  return { version: 1, action: m.action, suppression_id: typeof m.suppression_id === 'string' ? m.suppression_id : undefined };
}

/** A restore closes only its own archive event, never a later or concurrent one. */
export function suppressionsActives(traces: TraceCorbeilleFacture[]): TraceCorbeilleFacture[] {
  const remises = new Set(traces.flatMap(t => {
    const e = evenementCorbeille(t);
    return e?.action === 'remettre' && e.suppression_id ? [`${t.facture_id}:${e.suppression_id}`] : [];
  }));
  return traces.filter(t => evenementCorbeille(t)?.action === 'supprimer' && t.facture_id && !remises.has(`${t.facture_id}:${t.id}`));
}

export function factureDansCorbeille(factureId: string, traces: TraceCorbeilleFacture[]): boolean {
  return suppressionsActives(traces).some(t => t.facture_id === factureId);
}

export function snapshotCorbeille<T extends Record<string, unknown>>(facture: T, action: 'supprimer' | 'remettre', suppressionId?: string) {
  return { ...facture, _corbeille: { version: 1, action, ...(suppressionId ? { suppression_id: suppressionId } : {}) } };
}