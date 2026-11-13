/** Preview-only rental signing boundary. No database or mail transport is installed. */
import { validerSignaturePng } from './signaturePng.ts';

export const LOCATION_SIGNATURE_ACTIVE = false;
export const LOCATION_MODEL = 'contrat_location';
export interface LocationFrozen {
  id: string; learnerId: string; recipient: string; fingerprint: string;
  pdfPath: string; status: 'prepare' | 'envoye' | 'signe';
  delivery: 'prepare' | 'envoye' | 'en_cours' | 'indetermine';
  signature?: string; signedAt?: string;
}
export interface LocationSigningDeps {
  read(id: string): Promise<LocationFrozen | null>;
  verify(doc: LocationFrozen): Promise<boolean>;
  claim(id: string, expected: LocationFrozen['delivery']): Promise<boolean>;
  mail(doc: LocationFrozen, operation: string): Promise<'accepted' | 'refused' | 'unknown'>;
  finishMail(id: string, result: 'accepted' | 'refused' | 'unknown', previous: 'prepare' | 'envoye'): Promise<boolean>;
  /** Atomic append-only receipt + compare-and-set on unsigned document; preserves original bytes. */
  sign(id: string, fingerprint: string, png: string, operation: string): Promise<boolean>;
}
export async function sendLocation(deps: LocationSigningDeps, id: string, operation: string, resend = false) {
  const d = await deps.read(id);
  if (!d || d.status === 'signe' || !operation || !(await deps.verify(d))) return { state: 'blocked' };
  const expected = resend ? 'envoye' : 'prepare';
  if (d.delivery !== expected || (resend && d.status !== 'envoye')) return { state: 'blocked' };
  if (!(await deps.claim(id, expected))) return { state: 'busy' };
  let result: 'accepted' | 'refused' | 'unknown';
  try { result = await deps.mail(d, operation); } catch { result = 'unknown'; }
  const confirmed = await deps.finishMail(id, result, expected);
  return { state: confirmed ? result : 'unknown' };
}
export async function signLocation(deps: LocationSigningDeps, id: string, p: {
  fingerprint: string; signature: string; consent: boolean; operation: string;
}) {
  const d = await deps.read(id);
  if (!d || !(await deps.verify(d)) || d.fingerprint !== p.fingerprint) return { state: 'blocked' };
  if (d.status === 'signe') return { state: 'already_signed' };
  if (d.status !== 'envoye' || !p.consent || !p.operation) return { state: 'blocked' };
  const png = await validerSignaturePng(p.signature);
  if (!png.ok) return { state: 'invalid_signature' };
  return { state: await deps.sign(d.id, d.fingerprint, p.signature, p.operation) ? 'signed' : 'unconfirmed' };
}