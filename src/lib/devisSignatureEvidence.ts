export interface DevisEvidenceSource {
  signed_at?: string | null;
  statut?: string | null;
  devis_signe_url?: string | null;
  signature?: unknown;
  _signature_image?: unknown;
}

/** Only the quote's own evidence counts, never a signature borrowed from another form. */
export function devisSignatureEvidence(d: DevisEvidenceSource): 'signe' | 'a_verifier' | 'non_signe' {
  const dated = typeof d.signed_at === 'string' && Number.isFinite(Date.parse(d.signed_at));
  const ownImage = [d.signature, d._signature_image].some(v => typeof v === 'string' && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(v));
  if (dated && (ownImage || !!d.devis_signe_url?.trim())) return 'signe';
  if (d.signed_at || d.devis_signe_url || ownImage || /sign[eé]/i.test(d.statut ?? '')) return 'a_verifier';
  return 'non_signe';
}