// Retired candidate. Never call the old past-signature RPC.
import { SIGNATURE_PASSEE_REFUSEE } from './dateSignature.ts';

export async function signerTardivement(_client: unknown, _verifiedUserId: string, _body: Record<string, unknown>) {
  return { status: 403, error: SIGNATURE_PASSEE_REFUSEE, code: 'P0541' };
}