export interface AvisTrace {
  id: string;
  facture_id: string | null;
  numero: string;
  snapshot: unknown;
}

export function metaAvis(trace: AvisTrace): Record<string, unknown> | null {
  if (!trace.snapshot || typeof trace.snapshot !== 'object') return null;
  const value = (trace.snapshot as Record<string, unknown>)._corbeille;
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

export function destinataireAvisSuppression(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const email = (snapshot as Record<string, unknown>).client_email;
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? email.trim() : null;
}

export function notificationSuppressionFacture(numero: string) {
  return {
    sujet: `Facture supprimée — ${numero}`,
    message: `Nous vous informons que la facture n° ${numero} a été supprimée de notre liste de factures et placée dans la corbeille. Cette suppression ne constitue pas un avoir ni une annulation comptable ; les paiements déjà enregistrés sont conservés. Pour toute question, contactez contact@ftransport.fr.`,
  };
}

export function suppressionNotifiable(trace: AvisTrace, traces: AvisTrace[]): boolean {
  const meta = metaAvis(trace);
  if (!trace.facture_id || meta?.version !== 1 || meta.action !== 'supprimer') return false;
  return !traces.some(t => t.facture_id === trace.facture_id && metaAvis(t)?.version === 1 &&
    metaAvis(t)?.action === 'remettre' && metaAvis(t)?.suppression_id === trace.id);
}

export function statutAvisSuppression(trace: AvisTrace, traces: AvisTrace[]): 'non_envoye' | 'indetermine' | 'envoye' | 'historique' {
  if (metaAvis(trace)?.action !== 'supprimer') return 'historique';
  const receipts = traces.filter(t => t.facture_id === trace.facture_id && metaAvis(t)?.version === 1 && metaAvis(t)?.suppression_id === trace.id);
  if (receipts.some(t => metaAvis(t)?.action === 'avis_suppression_envoye')) return 'envoye';
  if (receipts.some(t => metaAvis(t)?.action === 'avis_suppression_engage')) return 'indetermine';
  return 'non_envoye';
}

/** Same event and stage have one immutable ID: concurrent callers cannot send twice. */
export async function identifiantAvisSuppression(suppressionId: string, stage: 'engage' | 'envoye' | 'indetermine') {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`facture-suppression:v1:${suppressionId}:${stage}`)));
  hash[6] = (hash[6] & 15) | 80;
  hash[8] = (hash[8] & 63) | 128;
  const hex = Array.from(hash.slice(0, 16), b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}