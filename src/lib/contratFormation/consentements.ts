// Texte exact des cases facultatives proposées à la signature. Toute modification = nouvelle version.
// Dupliqué à l'identique dans supabase/functions/upload-devis-signe (contrôlé par test).
export const CONSENTEMENTS_VERSION = 'consentements-2026-10-17-v1';
export const CONSENTEMENTS_SIGNATURE = {
  demarrageAnticipe: 'Je demande expressément que la prestation commence avant l’expiration du délai de rétractation applicable, sans renoncer aux droits qui subsistent.',
  perteApresExecution: 'Je reconnais que, dans les cas prévus par la loi, je perdrai mon droit de rétractation lorsque la prestation aura été entièrement exécutée avec mon accord préalable et exprès.',
} as const;
export const DEVIS_CONTRAT_VERSION = 'devis-contrat-2026-10-17-v1';
