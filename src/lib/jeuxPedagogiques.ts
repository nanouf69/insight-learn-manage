import type { CompletionLite, VolumeModule } from "@/lib/jalonsPonderes";

/**
 * REGISTRE CANONIQUE des activités d'un module définies dans le code (hors
 * module_data de l'éditeur), ex. jeux cartographiques. Source UNIQUE lue par :
 * l'affichage élève du module, le calcul des volumes, la progression des jalons
 * et la lecture des réalisations serveur. Ajouter une activité ici suffit : elle
 * est rattachée à toutes les filières dont le parcours réel contient le module.
 *
 * Volume = nombre réel d'éléments à réaliser (1 unité chacun, comme une question).
 * Terminé = réalisation complète confirmée par le serveur (reponses_apprenants,
 * completed = true) — jamais un score, jamais un stockage local.
 */
export interface ActiviteCode { id: string; moduleId: number; titre: string; unites: number; ajouteeLe: string; retireeLe?: string }

export const ACTIVITES_CODE: ActiviteCode[] = [
  { id: "jeu_lyon_arrondissements_quartiers", moduleId: 8, titre: "Lyon : arrondissements et quartiers", unites: 22, ajouteeLe: "2026-10-13T10:41:00Z" },
  { id: "jeu_lyon_lieux", moduleId: 8, titre: "Lyon : monuments, musées et lieux touristiques", unites: 24, ajouteeLe: "2026-10-13T10:41:00Z" },
];
export const EXERCICE_TYPE_JEU = "jeu_carte";
export const METHODE_ACTIVITES = "jalons-calcul v4 — 13/10/2026 (activités du registre incluses)";

/** Activités actives (non retirées) d'un module à une date donnée. */
export function activitesDuModule(moduleId: number, a: string = new Date().toISOString()): ActiviteCode[] {
  return ACTIVITES_CODE.filter((x) => x.moduleId === moduleId && x.ajouteeLe <= a && (!x.retireeLe || x.retireeLe > a));
}
export const idsActivites = (moduleIds: number[]) => moduleIds.flatMap((m) => activitesDuModule(m).map((x) => x.id));

// Compatibilité (jeux de Lyon)
export const JEUX_LYON = ACTIVITES_CODE.filter((x) => x.moduleId === 8);
export const IDS_JEUX_LYON = JEUX_LYON.map((j) => j.id);
export const UNITES_JEUX_LYON = JEUX_LYON.reduce((s, j) => s + j.unites, 0);

export interface EtatActivites { moduleId: number; termines: string[]; requises: string[]; versionAnterieureValidee: boolean; progressionModuleSeul: number }

const unitesModule = (v: VolumeModule) => v.points ?? 4 * Math.max(0, v.pages) + Math.max(0, v.questions);

/**
 * Progression courante d'un module incluant ses activités du registre.
 * Un module validé avant l'ajout d'activités garde son statut EN BASE (jamais réécrit),
 * mais le calcul courant ne l'affiche plus à 100 % tant que les nouvelles activités ne
 * sont pas terminées : « version antérieure validée » + activités à faire.
 */
export function completionAvecActivites(
  row: (CompletionLite & { completed_at?: string | null }) | undefined,
  volume: VolumeModule,
  activites: ActiviteCode[],
  termines: Set<string>,
): { completion: CompletionLite; etat: EtatActivites } {
  const moduleId = Number(row?.module_id ?? activites[0]?.moduleId);
  const faits = activites.filter((a) => termines.has(a.id)).map((a) => a.id);
  const progModule = row?.status === "completed" ? 100 : Math.max(0, Math.min(100, Number(row?.progress) || 0));
  const etat: EtatActivites = { moduleId, termines: faits, requises: activites.map((a) => a.id), versionAnterieureValidee: row?.status === "completed" && faits.length < activites.length, progressionModuleSeul: progModule };
  const um = unitesModule(volume);
  const ua = activites.reduce((s, a) => s + a.unites, 0);
  const uf = activites.reduce((s, a) => s + (termines.has(a.id) ? a.unites : 0), 0);
  const total = um + ua;
  const tout = progModule >= 100 && faits.length === activites.length;
  const p = total > 0 ? (((progModule * um) / 100 + uf) / total) * 100 : 0;
  return { completion: { module_id: moduleId, status: tout ? "completed" : "in_progress", progress: tout ? 100 : Math.min(99.9, p) }, etat };
}
