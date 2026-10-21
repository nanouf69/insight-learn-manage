import { activitesRequisesModule } from "@/lib/jeuxPedagogiques";
import { PRATIQUE_PHYSIQUE } from "@/lib/jalonsPonderes";
import { exceptionModulesEleve, activitesDispenseesPourParcours } from "@/lib/exceptionsModulesEleve";
import type { CompletionLite } from "@/lib/moduleUnlockLogic";

export interface ModuleEleveLite { id: number; nom: string }
export interface ModuleRestant { id: number; nom: string; raison: "module" | "nouvelles_activites"; pratique: boolean }
export type ProgressionModules =
  | { etat: "indisponible" }
  | { etat: "ok"; total: number; termines: number; restants: ModuleRestant[]; seulementPratique: boolean };

/**
 * Comptage AFFICHÉ à l'élève : un module = un identifiant (jamais un jeu compté comme module).
 * Terminé = statut serveur « completed » ET activités du registre requises terminées
 * (confirmées par le serveur). Lecture impossible => indisponible (jamais 0 ni 100 %).
 */
export function progressionModulesEleve(
  modules: ModuleEleveLite[],
  estTermineServeur: (id: number) => boolean,
  activitesTerminees: Set<string> | null,
  date?: string,
  apprenantId?: string | null,
  completions: readonly CompletionLite[] = [],
): ProgressionModules {
  const exception = exceptionModulesEleve(apprenantId);
  const dispensesHistoriques = activitesDispenseesPourParcours(modules, completions, apprenantId);
  const vus = new Map<number, ModuleEleveLite>();
  for (const m of modules) if (!exception?.rubriquesHorsCompteur.includes(Number(m.id)) && !vus.has(Number(m.id))) vus.set(Number(m.id), m);
  const restants: ModuleRestant[] = [];
  let termines = 0;
  for (const m of vus.values()) {
    // Gel par module : une activité ajoutée après la validation serveur de CE module n'est pas exigée.
    const ligne = completions.find((c) => Number(c.module_id) === Number(m.id) && c.status === "completed");
    const acts = activitesRequisesModule(m.id, ligne, date).filter(a => !exception?.activitesDispensees.includes(a.id) && !dispensesHistoriques.has(a.id));
    if (acts.length && !activitesTerminees) return { etat: "indisponible" };
    const actsOk = acts.every((a) => activitesTerminees?.has(a.id) === true);
    const serveur = estTermineServeur(m.id);
    // Le jalon physique est distinct des modules pédagogiques en ligne 6/8.
    const pratique = m.id === PRATIQUE_PHYSIQUE;
    if (serveur && actsOk) termines++;
    else restants.push({ id: m.id, nom: m.nom, raison: serveur ? "nouvelles_activites" : "module", pratique });
  }
  return { etat: "ok", total: vus.size, termines, restants, seulementPratique: restants.length > 0 && restants.every((r) => r.pratique) };
}
