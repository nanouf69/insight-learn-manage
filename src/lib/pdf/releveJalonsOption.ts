import { chargerCalculJalons, formationJalonsElearning } from "@/lib/jalonsPedagogiques";
import { tableauAffichageJalons } from "@/lib/affichageJalons";
import { chargerEtatGel } from "@/lib/releveJalonsGel";
import { MODULE_NAME_BY_ID } from "@/components/cours-en-ligne/modules-config";

/** Date de mise en place des jalons pondérés : avant, le relevé garde le taux e-learning. */
export const DATE_MISE_EN_PLACE_JALONS = "2026-10-11";

export interface JalonsReleve { taux: number; lignes: { libelle: string; poids: number; progression: number; valide: boolean }[]; mention?: string }

export function jalonsApplicables(a: any): boolean {
  const ref = String(a?.date_debut_formation || a?.date_debut_cours_en_ligne || a?.created_at || "").slice(0, 10);
  return !!ref && ref >= DATE_MISE_EN_PLACE_JALONS && !!formationJalonsElearning(a?.type_apprenant, a?.formation_choisie);
}

export const MESSAGE_JALONS_INDISPONIBLES = "Relevé non généré : taux de jalons indisponible (synchronisation serveur en cours ou lecture impossible). Aucun taux de repli n'est imprimé ; relancez l'export.";
export class JalonsReleveIndisponibles extends Error { constructor(public cause?: unknown) { super(MESSAGE_JALONS_INDISPONIBLES); } }

/**
 * Lecture seule. Non applicable / gel en attente = null (taux e-learning historique).
 * Applicable mais illisible ou non concordant = erreur : jamais de taux e-learning de repli.
 */
export async function chargerJalonsReleve(a: any): Promise<JalonsReleve | null> {
  if (!jalonsApplicables(a)) return null;
  try {
    const etat = await chargerEtatGel(a.id);
    if (etat?.etat === "en_attente") return null;
    const gel = etat?.etat === "fige" ? etat.gel : null;
    const calcul = await chargerCalculJalons({ apprenantId: a.id, typeApprenant: a.type_apprenant, formationChoisie: a.formation_choisie, gel });
    const t = tableauAffichageJalons(calcul);
    return {
      taux: t.taux,
      mention: gel ? "releve fige a la fin des acces" : undefined,
      lignes: t.lignes.map((l: any) => ({
        libelle: l.moduleId === 0 ? "Introduction" : (MODULE_NAME_BY_ID as any)[l.moduleId] || `Module ${l.moduleId}`,
        poids: l.poidsAffiche, progression: l.progression, valide: l.valide,
      })),
    };
  } catch (e) {
    console.error("[releve] jalons indisponibles", e);
    throw new JalonsReleveIndisponibles(e);
  }
}
