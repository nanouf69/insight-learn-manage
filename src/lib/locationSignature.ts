import { blocagesSignature, type ContexteSignature } from './contratLocationClauses';
export { LOCATION_SIGNATURE_ACTIVE } from '../../supabase/functions/_shared/locationSignatureCore';
/** Recipient signs later; neither learner consent nor a departure signature is invented here. */
export function locationMailBlockers(c: Omit<ContexteSignature, 'edlDepartSigne' | 'consentementSpecifique'>, policeBlockers: string[], active: boolean) {
  return [
    ...policeBlockers,
    ...blocagesSignature({ ...c, edlDepartSigne: true, consentementSpecifique: true }),
    ...(!active ? ['Envoi par mail non activé : stockage sécurisé et signature du contrat à vérifier avant mise en service.'] : []),
  ];
}