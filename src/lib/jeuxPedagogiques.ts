import type { CompletionLite, Filiere, VolumeModule } from "@/lib/jalonsPonderes";

/**
 * Jeux cartographiques de Lyon : deux activités distinctes du module 8 (PRATIQUE VTC,
 * parcours VTC et VA). Volume réel = nombre d'éléments à placer (1 unité = 1 placement,
 * comme une question) : 9 arrondissements + 13 quartiers, puis 24 lieux.
 * Terminé = toutes les étiquettes placées (réalisation, jamais un score minimal),
 * confirmé par le serveur dans reponses_apprenants (completed = true).
 */
export const MODULE_JEUX = 8;
export const JEUX_LYON = [
  { id: "jeu_lyon_arrondissements_quartiers", titre: "Lyon : arrondissements et quartiers", unites: 22 },
  { id: "jeu_lyon_lieux", titre: "Lyon : monuments, musées et lieux touristiques", unites: 24 },
] as const;
export const EXERCICE_TYPE_JEU = "jeu_carte";
export const IDS_JEUX_LYON = JEUX_LYON.map((j) => j.id);
export const UNITES_JEUX_LYON = JEUX_LYON.reduce((s, j) => s + j.unites, 0);
/** Un module 8 validé AVANT cette date garde son statut historique (100 %) ; après, les jeux sont exigés. */
export const DATE_EXIGENCE_JEUX = "2026-10-13T12:30:00Z";
export const METHODE_JEUX = "jalons-calcul v4 — 13/10/2026 (jeux cartographiques du module 8)";

export const filiereAvecJeux = (f: Filiere) => f === "vtc" || f === "va";

export interface EtatJeux { termines: string[]; requis: number; statutHistorique: boolean; progressionModuleSeul: number }

/** Unités pondérées du module (sans les jeux), même règle que unites(). */
const unitesModule = (v: VolumeModule) => v.points ?? 4 * Math.max(0, v.pages) + Math.max(0, v.questions);

/**
 * Progression du module 8 intégrant les jeux. Jamais 100 % tant qu'un jeu requis
 * n'est pas terminé, sauf validation historique antérieure à l'exigence (statut conservé).
 */
export function completionAvecJeux(row: (CompletionLite & { completed_at?: string | null }) | undefined, volume: VolumeModule, termines: Set<string>): { completion: CompletionLite; etat: EtatJeux } {
  const faits = IDS_JEUX_LYON.filter((id) => termines.has(id));
  const historique = row?.status === "completed" && !!row.completed_at && row.completed_at < DATE_EXIGENCE_JEUX;
  const progModule = row?.status === "completed" ? 100 : Math.max(0, Math.min(100, Number(row?.progress) || 0));
  const etat: EtatJeux = { termines: faits, requis: JEUX_LYON.length, statutHistorique: historique, progressionModuleSeul: progModule };
  if (historique) return { completion: { module_id: MODULE_JEUX, status: "completed", progress: 100 }, etat };
  const um = unitesModule(volume);
  const uj = JEUX_LYON.reduce((s, j) => s + (termines.has(j.id) ? j.unites : 0), 0);
  const total = um + UNITES_JEUX_LYON;
  const p = total > 0 ? ((progModule * um) / 100 + uj) / total * 100 : 0;
  const tout = progModule >= 100 && faits.length === JEUX_LYON.length;
  return { completion: { module_id: MODULE_JEUX, status: tout ? "completed" : "in_progress", progress: tout ? 100 : Math.min(99.9, p) }, etat };
}
