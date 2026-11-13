// STAGED ONLY: deliberately not imported by index.ts; no live writes enabled.
import { signatureVide } from './signatureVide.ts';

export async function signerTardivement(client: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }> }, verifiedUserId: string, body: Record<string, unknown>) {
  const signature = typeof body.signature_data_url === 'string' ? body.signature_data_url : '';
  if (body.confirme_identite !== true || body.confirme_presence_creneau !== true || body.absent === true) {
    return { status: 400, error: 'Confirmez votre identité et votre présence réelle à ce créneau.' };
  }
  if (signature.length > 600_000 || signatureVide(signature)) return { status: 400, error: 'Signature vide ou illisible : aucun enregistrement.' };
  const { data, error } = await client.rpc('emargement_tardif_signer', {
    p_operation: body.operation_id, p_signataire: verifiedUserId, p_regularisation: body.regularisation_id,
    p_apprenant: body.apprenant_id, p_date: body.date_emargement, p_creneau: body.demi_journee,
    p_signature: signature, p_presence: true, p_identite: true, p_user_agent: String(body.user_agent ?? '').slice(0,500),
  });
  if (error) return { status: error.code === '42501' ? 403 : 409, error: error.message, code: error.code };
  return { status: 200, data };
}