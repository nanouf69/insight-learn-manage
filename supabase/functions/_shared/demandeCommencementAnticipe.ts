/**
 * Demande expresse de commencement avant la fin du délai de rétractation (contrat conclu à distance /
 * hors établissement avec un consommateur, C. consom. L221-18, L221-25, L221-28 1°).
 * Facultative, jamais précochée, jamais une renonciation : le client garde son droit de rétractation.
 */
export const DEMANDE_COMMENCEMENT_VERSION = "demande-commencement-anticipe-2026-11-20-v1";
export const DEMANDE_COMMENCEMENT_TEXTE =
  "Facultatif — Je demande expressément que la formation commence avant la fin de mon délai de rétractation de 14 jours " +
  "(articles L221-18 et L221-25 du Code de la consommation). Je reste libre de me rétracter pendant ce délai : " +
  "dans ce cas, je ne devrai qu'un montant proportionnel à la formation effectivement suivie jusqu'à ma rétractation. " +
  "Je perdrai mon droit de rétractation uniquement si la formation a été entièrement exécutée avant la fin du délai " +
  "(article L221-28 1°). Sans cette demande, la formation ne commencera pas avant la fin du délai.";

/** Applicable seulement au client particulier (financement personnel) signant à distance, hors devis valant contrat. */
export function demandeCommencementApplicable(d: { contrat_conditions?: unknown; organisation_id?: string | null }): boolean {
  if (d.contrat_conditions) return false; // contrat de formation individuel : règles L6353-5/L6353-6 et cases propres
  return !d.organisation_id; // payeur professionnel : pas un consommateur, aucune case
}

export function preuveDemandeCommencement(coche: boolean, horodatageServeur: string, userAgent: string | null) {
  return {
    version: DEMANDE_COMMENCEMENT_VERSION,
    coche,
    texte: DEMANDE_COMMENCEMENT_TEXTE,
    horodatage_serveur: horodatageServeur,
    user_agent: userAgent,
    nature: "demande de commencement anticipé — n'emporte pas renonciation au droit de rétractation",
  };
}
