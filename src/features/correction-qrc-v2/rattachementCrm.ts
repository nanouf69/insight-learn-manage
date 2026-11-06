export type LienSessionCrm = {
  session: { id: string; nom?: string | null; date_debut: string; date_fin: string };
  debut: string;
  fin: string;
};

export type DecisionRattachementCrm =
  | { type: "unique" | "croisee"; sessions: LienSessionCrm[] }
  | { type: "indetermine" | "conflit"; sessions: [] };

/**
 * Rattachement d'affichage uniquement. L'inscription croisée autorisée est volontairement
 * s'applique à tout examen blanc dès que exactement deux sessions couvrent le jour du passage ;
 * trois sessions ou plus restent un conflit explicite.
 */
export function deciderRattachementCrm(params: {
  jour: string;
  examId: string;
  typeApprenant: string;
  liens: LienSessionCrm[];
}): DecisionRattachementCrm {
  const couvrantes = params.liens.filter((lien) => params.jour >= lien.debut && params.jour <= lien.fin);
  const uniques = Array.from(new Map(couvrantes.map((lien) => [lien.session.id, lien])).values());

  if (uniques.length === 1) return { type: "unique", sessions: uniques };
  // Générique (tous EB, toutes filières) : l'examen reste séparé par son exam_id ;
  // seul l'affichage dans les deux sessions réellement inscrites est ajouté.
  if (uniques.length === 2) return { type: "croisee", sessions: uniques };
  return uniques.length === 0 ? { type: "indetermine", sessions: [] } : { type: "conflit", sessions: [] };
}

/** Compte chaque passage croisé une seule fois dans l'affichage courant. */
export function nombrePassagesCroises(
  attemptIds: string[],
  marquages: Record<string, string[]> | undefined,
): number {
  if (!marquages) return 0;
  return new Set(attemptIds.filter((id) => (marquages[id]?.length ?? 0) > 0)).size;
}
