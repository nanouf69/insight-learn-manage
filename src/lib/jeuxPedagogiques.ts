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
export interface ActiviteCode { id: string; moduleId: number; titre: string; unites: number; ajouteeLe: string; retireeLe?: string; exigeeSiValideApres?: string;
  /** Module validé avant la borne : activité exclue aussi du volume/poids/durée (jalons strictement inchangés). */
  horsVolumeSiValideAvant?: boolean }

/**
 * Dispense historique module 6 (demande Naoufal, horodatage serveur du message 23/10/2026 09:51:00 UTC) :
 * « sauf ceux qui ont fini le module » = tout module validé AVANT cet instant garde son acquis,
 * même validé entre l'ajout (21/10) et la demande. Bornée : un module validé après doit faire les 3.
 */
export const BORNE_DISPENSE_TAXI_2026 = "2026-10-23T09:51:00Z";
/** Ajout cours + quiz Équipements TAXI (partie locale module 10) : horodatage de la demande. */
export const BORNE_EQUIPEMENTS_TAXI_LOCALE = "2026-10-27T13:52:00Z";
/** Instant à partir duquel une validation de module n'exempte plus l'activité. */
export const bornePourGel = (a: ActiviteCode) => Date.parse(a.exigeeSiValideApres ?? a.ajouteeLe);
/** Activité neutre pour ce module (validé avant sa borne, ou validé sans date) : hors volume. */
export function activiteHorsVolume(a: ActiviteCode, row: { status?: string | null; completed_at?: string | null } | undefined | null): boolean {
  if (!a.horsVolumeSiValideAvant || row?.status !== "completed") return false;
  const t = row.completed_at ? Date.parse(row.completed_at) : NaN;
  return !Number.isFinite(t) || t < bornePourGel(a);
}

export const ACTIVITES_CODE: ActiviteCode[] = [
  { id: "jeu_lyon_arrondissements_quartiers", moduleId: 8, titre: "Lyon : arrondissements et quartiers", unites: 22, ajouteeLe: "2026-10-13T10:41:00Z" },
  { id: "jeu_lyon_lieux", moduleId: 8, titre: "Lyon : monuments, musées et lieux touristiques", unites: 24, ajouteeLe: "2026-10-13T10:41:00Z" },
  { id: "jeu_taxi_2026_feries_v1", moduleId: 6, titre: "Calendrier des jours fériés 2026", unites: 11, ajouteeLe: "2026-10-21T16:35:40.331Z", exigeeSiValideApres: BORNE_DISPENSE_TAXI_2026 },
  { id: "jeu_taxi_2026_tarifs_v1", moduleId: 6, titre: "Tarifs TAXI du Rhône 2026", unites: 30, ajouteeLe: "2026-10-21T16:35:40.331Z", exigeeSiValideApres: BORNE_DISPENSE_TAXI_2026 },
  { id: "jeu_taxi_2026_rtst_v1", moduleId: 6, titre: "13 situations pratiques — RTST", unites: 13, ajouteeLe: "2026-10-21T16:35:40.331Z", exigeeSiValideApres: BORNE_DISPENSE_TAXI_2026 },
  // Partie locale module 10 (demande 27/10/2026 13:52 UTC) : modules validés avant = acquis inchangé, hors volume.
  { id: "quiz_taxi_locale_equipements_v1", moduleId: 10, titre: "Quiz — Équipements et documents TAXI", unites: 15, ajouteeLe: BORNE_EQUIPEMENTS_TAXI_LOCALE, horsVolumeSiValideAvant: true },
];
export const EXERCICE_TYPE_JEU = "jeu_carte";
export const METHODE_ACTIVITES = "jalons-calcul v4 — 13/10/2026 (activités du registre incluses)";

/**
 * Activités d'un module. Sans date explicite (affichage élève courant) : toutes les
 * activités non retirées du registre — JAMAIS l'horloge de l'appareil, qui peut être
 * fausse sur une tablette (21/10). Une date explicite (relevé gelé, gele_le serveur)
 * reste appliquée telle quelle.
 */
export function activitesDuModule(moduleId: number, a?: string): ActiviteCode[] {
  if (a === undefined) return ACTIVITES_CODE.filter((x) => x.moduleId === moduleId && !x.retireeLe);
  return ACTIVITES_CODE.filter((x) => x.moduleId === moduleId && x.ajouteeLe <= a && (!x.retireeLe || x.retireeLe > a));
}
/**
 * Gel PAR MODULE (règle 15/10/2026) : instant de validation serveur d'un module, si prouvé
 * (status completed + completed_at lisible). Une activité ajoutée APRÈS cet instant ne
 * rouvre jamais ce module ni ne baisse son acquis ; elle reste faisable en révision facultative.
 * Absent/illisible => null (aucune date inventée) ; un module « completed » sans date reste
 * néanmoins acquis (aucune activité exigée) : une validation prouvée ne recule jamais.
 */
export function instantValidationModule(row: { status?: string | null; completed_at?: string | null } | undefined | null): string | null {
  if (!row || row.status !== "completed" || !row.completed_at) return null;
  const t = Date.parse(row.completed_at);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
/** Activités exigées pour un module : celles du registre à la date, bornées à sa validation si validé. */
export function activitesRequisesModule(moduleId: number, row: { status?: string | null; completed_at?: string | null } | undefined | null, a?: string): ActiviteCode[] {
  // Validation serveur prouvée mais date absente/illisible : l'acquis est conservé (aucune date inventée).
  if (row?.status === "completed" && !instantValidationModule(row)) return [];
  const gel = instantValidationModule(row);
  return activitesDuModule(moduleId, a).filter((x) => !gel || bornePourGel(x) <= Date.parse(gel));
}
export const idsActivites = (moduleIds: number[]) => moduleIds.flatMap((m) => activitesDuModule(m).map((x) => x.id));

// Compatibilité (jeux de Lyon)
export const JEUX_LYON = ACTIVITES_CODE.filter((x) => x.moduleId === 8);
export const IDS_JEUX_LYON = JEUX_LYON.map((j) => j.id);
export const UNITES_JEUX_LYON = JEUX_LYON.reduce((s, j) => s + j.unites, 0);

export interface EtatActivites { moduleId: number; termines: string[]; requises: string[]; versionAnterieureValidee: boolean; progressionModuleSeul: number; ajouteesApresValidation?: string[]; valideLe?: string | null; valideSansDate?: boolean }

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
  // Gel par module : activités ajoutées après la validation = acquises pour CE module
  // Unités gardées dans le volume COURANT (pas un volume historique figé) et comptées
  // acquises pour garantir 100 % à ce module ; jamais marquées « faites ».
  const gel = instantValidationModule(row);
  const valideSansDate = row?.status === "completed" && !gel;
  const apres = valideSansDate ? [...activites] : gel ? activites.filter((a) => bornePourGel(a) > Date.parse(gel)) : [];
  const requises = activites.filter((a) => !apres.includes(a));
  const faits = activites.filter((a) => termines.has(a.id)).map((a) => a.id);
  const faitsRequis = requises.filter((a) => termines.has(a.id));
  const progModule = row?.status === "completed" ? 100 : Math.max(0, Math.min(100, Number(row?.progress) || 0));
  const etat: EtatActivites = { moduleId, termines: faits, requises: requises.map((a) => a.id), versionAnterieureValidee: row?.status === "completed" && faitsRequis.length < requises.length, progressionModuleSeul: progModule, ajouteesApresValidation: apres.map((a) => a.id), valideLe: gel, valideSansDate };
  const um = unitesModule(volume);
  const ua = activites.reduce((s, a) => s + a.unites, 0);
  const uf = activites.reduce((s, a) => s + (termines.has(a.id) || apres.includes(a) ? a.unites : 0), 0);
  const total = um + ua;
  const tout = progModule >= 100 && faitsRequis.length === requises.length;
  const p = total > 0 ? (((progModule * um) / 100 + uf) / total) * 100 : 0;
  return { completion: { module_id: moduleId, status: tout ? "completed" : "in_progress", progress: tout ? 100 : Math.min(99.9, p) }, etat };
}
