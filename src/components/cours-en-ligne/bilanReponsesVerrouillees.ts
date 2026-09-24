/**
 * Réponses historiques verrouillées (anciens passages ORANGE des Bilans).
 * Une réponse dont la version historique n'est pas prouvable est conservée
 * telle quelle, n'est plus modifiable et n'est jamais recorrigée contre la
 * question actuelle. Le serveur restaure de toute façon la valeur d'origine
 * (trigger trg_0b_bilan_reponses_verrouillees).
 */
export type ReponseStatut = "CERTAINE" | "VERSION_NON_PROUVEE" | "ORPHELINE" | "LITIGIEUSE";

export interface StatutRow {
  exercice_id: number;
  tentative: number;
  cle: string;
  statut: ReponseStatut;
  reponse: unknown;
}
export interface CategorieRow {
  exercice_id: number;
  tentative: number;
  categorie: "HISTORIQUE" | "VERT" | "ORANGE" | "ROUGE";
}

/** Clé -> réponse conservée, uniquement pour la tentative ORANGE courante de chaque matière. */
export function reponsesVerrouilleesDepuis(
  statuts: StatutRow[],
  categories: CategorieRow[],
): Record<string, string | string[]> {
  const derniere = new Map<number, CategorieRow>();
  for (const c of categories) {
    const cur = derniere.get(c.exercice_id);
    if (!cur || c.tentative > cur.tentative) derniere.set(c.exercice_id, c);
  }
  const out: Record<string, string | string[]> = {};
  for (const s of statuts) {
    if (s.statut !== "VERSION_NON_PROUVEE") continue;
    const cat = derniere.get(s.exercice_id);
    if (!cat || cat.categorie !== "ORANGE" || cat.tentative !== s.tentative) continue;
    const v = s.reponse;
    if (typeof v === "string" || (Array.isArray(v) && v.every((x) => typeof x === "string"))) {
      out[s.cle] = v as string | string[];
    }
  }
  return out;
}

/** Sépare les questions interactives des questions à réponse historique verrouillée. */
export function separerQuestionsVerrouillees<Q extends { id: number | string }>(
  exoId: number | string,
  questions: Q[],
  verrouillees: Record<string, unknown>,
): { actives: Q[]; verrouillees: Q[] } {
  const actives: Q[] = [];
  const lock: Q[] = [];
  for (const q of questions) {
    if (Object.prototype.hasOwnProperty.call(verrouillees, `${exoId}-${q.id}`)) lock.push(q);
    else actives.push(q);
  }
  return { actives, verrouillees: lock };
}

export const LIBELLES_STATUT_ADMIN: Record<ReponseStatut, string> = {
  CERTAINE: "Réponse certaine",
  VERSION_NON_PROUVEE: "À VÉRIFIER — version historique non prouvée",
  ORPHELINE: "Orpheline — question disparue",
  LITIGIEUSE: "Litigieuse — numéro réutilisé",
};
