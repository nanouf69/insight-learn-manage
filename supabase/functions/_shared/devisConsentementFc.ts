// Source unique client/serveur : toute modification du texte impose une nouvelle version.
export const CONSENTEMENT_FC_VERSION = 'fc-annulation-remboursement-2026-11-11-v1';
export const CONSENTEMENT_FC_ANNULATION = 'Je reconnais avoir été informé(e) que toute demande d’annulation et de remboursement doit être formulée dans les délais prévus aux conditions contractuelles et à la réglementation applicable, soit par email à contact@ftransport.fr en précisant mon identité, la session concernée et le motif, soit par lettre recommandée avec accusé de réception à l’adresse officielle de l’organisme : FTRANSPORT, 86 route de Genas, 69003 Lyon. Une simple demande téléphonique ne permet pas d’établir une demande écrite de remboursement. Cette information de procédure ne vaut pas renonciation à mes droits légaux et ne supprime aucun droit impératif de rétractation ou de remboursement.';
export const CONSENTEMENT_FC_RESERVE = 'Information de procédure écrite uniquement ; aucun nouveau délai et aucune renonciation aux droits légaux, contractuels ou impératifs de rétractation/remboursement.';

const normaliser = (value: unknown) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export type DevisFormationContinueMin = { modele?: string | null; formation?: string | null };

export function estDevisFormationContinue(devis: DevisFormationContinueMin): boolean {
  const texte = normaliser(`${devis.modele ?? ''} ${devis.formation ?? ''}`);
  return /(?:^|\W)fc[\s_-]*(vtc|taxi)(?:\W|$)/.test(texte)
    || texte.includes('formation continue')
    || /(?:^|\W)continue[\s_-]*(vtc|taxi)(?:\W|$)/.test(texte)
    || texte.includes('formation a la mobilite')
    || /(?:^|\W)taxi[\s_-]*mobilite(?:\W|$)/.test(texte);
}

export function refusConsentementFormationContinue(devis: DevisFormationContinueMin, coche: boolean): string | null {
  return estDevisFormationContinue(devis) && !coche
    ? 'Veuillez confirmer avoir pris connaissance de la procédure écrite de demande d’annulation et de remboursement.'
    : null;
}

export function construirePreuveConsentementFormationContinue(params: {
  devis: DevisFormationContinueMin & { id: string; dates_formation?: string | null };
  identite: { nom: string; apprenant_id?: string | null; email?: string | null };
  horodatageServeur: string;
  userAgent?: string | null;
}) {
  return {
    version: CONSENTEMENT_FC_VERSION,
    horodatage_serveur: params.horodatageServeur,
    user_agent: params.userAgent ?? null,
    annulation_remboursement_fc: {
      coche: true,
      texte: CONSENTEMENT_FC_ANNULATION,
      version: CONSENTEMENT_FC_VERSION,
      horodatage_serveur: params.horodatageServeur,
      identite: params.identite,
      devis: {
        id: params.devis.id,
        modele: params.devis.modele ?? null,
        formation: params.devis.formation ?? null,
        session: params.devis.dates_formation ?? null,
      },
    },
    reserve_fc: CONSENTEMENT_FC_RESERVE,
  } as const;
}
