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

// FC TAXI — demande facultative de démarrage anticipé (contrat à distance / hors établissement seulement).
// Jamais de renonciation générale : le droit de rétractation est conservé (L221-25) ; la perte du droit
// n'intervient qu'après exécution complète avec accord exprès ET reconnaissance distincte (L221-28 1°).
// Le Code du travail (L6353-5 : 10 jours ; L6353-6 : aucun paiement avant expiration) reste réservé.
export const DEMARRAGE_FC_TAXI_VERSION = 'fc-taxi-demarrage-anticipe-2026-11-20-v1';
export const DEMARRAGE_FC_TAXI_DEMANDE = 'Je demande expressément que la formation commence avant la fin du délai de rétractation.';
export const DEMARRAGE_FC_TAXI_EXPLICATION = 'Case facultative, non obligatoire pour signer. Même si vous la cochez, vous conservez votre droit de rétractation jusqu’à la fin du délai de 14 jours. Si vous vous rétractez après le début de la formation, seul un montant proportionné à la formation déjà dispensée jusqu’à votre rétractation pourra être dû (article L221-25 du Code de la consommation). Aucun paiement n’est exigible avant la fin du délai de rétractation (article L6353-6 du Code du travail). Cette demande ne modifie pas les dates de la session.';
export const DEMARRAGE_FC_TAXI_RECONNAISSANCE = 'Je reconnais que, si la formation est entièrement exécutée avant la fin du délai de rétractation, je ne disposerai plus de ce droit pour cette formation (article L221-28, 1° du Code de la consommation), sous réserve des droits que me reconnaît le Code du travail.';

export function modeDepuisModeleFcTaxi(modele: string | null | undefined): 'centre' | 'distance' | null {
  const m = /^fc_taxi_pdf_v6_(centre|distance)$/.exec(String(modele ?? ''));
  return m ? (m[1] as 'centre' | 'distance') : null;
}

/** Preuve horodatée serveur ; null si non applicable. Erreur si incohérent (refus au lieu d'une fausse preuve). */
export function preuveDemarrageAnticipeFcTaxi(p: { modele?: string | null; demande: boolean; reconnaissance: boolean; horodatageServeur: string }) {
  const mode = modeDepuisModeleFcTaxi(p.modele);
  if (!mode) return null;
  if (mode === 'centre') {
    if (p.demande || p.reconnaissance) throw new Error('Contrat signé au centre : aucune demande de démarrage anticipé n’est proposée (délai de 10 jours L6353-5 maintenu).');
    return null;
  }
  if (p.reconnaissance && !p.demande) throw new Error('La reconnaissance ne peut être recueillie que si la demande expresse de démarrage anticipé est cochée.');
  return {
    version: DEMARRAGE_FC_TAXI_VERSION,
    horodatage_serveur: p.horodatageServeur,
    mode,
    demande_expresse: { coche: p.demande, texte: DEMARRAGE_FC_TAXI_DEMANDE },
    explication_affichee: DEMARRAGE_FC_TAXI_EXPLICATION,
    reconnaissance_perte_apres_execution_complete: { coche: p.reconnaissance, texte: DEMARRAGE_FC_TAXI_RECONNAISSANCE },
    reserve: 'Aucune renonciation générale ; L6353-5/L6353-6 réservés ; aucune date ni paiement avancés.',
  } as const;
}
