/**
 * Étape 2 sécurité des accès — décision d'afficher la demande de changement
 * de mot de passe. Règle pure, testée sur données simulées.
 */
export type EtatChangementMdp = { requis: boolean; examen_en_cours: boolean } | null;

export type ContexteEcran = {
  /** L'élève est sur son tableau de bord (aucun module/examen ouvert). */
  surTableauDeBord: boolean;
  /** Aperçu admin/formateur de la vue apprenant. */
  apercu: boolean;
};

export function doitDemanderChangementMdp(etat: EtatChangementMdp, ctx: ContexteEcran): boolean {
  if (!etat || ctx.apercu) return false;
  if (!etat.requis) return false;
  // Exception absolue : jamais pendant un examen blanc, ni hors tableau de bord.
  if (etat.examen_en_cours) return false;
  if (!ctx.surTableauDeBord) return false;
  return true;
}

export type VerifMdp = { ok: true } | { ok: false; raison: string };

export function verifierNouveauMdp(mdp: string, confirmation: string): VerifMdp {
  if (!mdp || mdp.length < 8) return { ok: false, raison: "Au moins 8 caractères." };
  if (!/[A-Za-z]/.test(mdp) || !/\d/.test(mdp))
    return { ok: false, raison: "Au moins une lettre et un chiffre." };
  if (mdp !== confirmation) return { ok: false, raison: "Les deux mots de passe ne correspondent pas." };
  return { ok: true };
}
