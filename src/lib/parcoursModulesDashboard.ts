import { FORMATIONS, MODULES_DATA, expandModulesAutorises, type FormationId } from "@/components/cours-en-ligne/formations-data";

// Map CRM values to formation IDs (supports lowercase, aliases and multi-selection values like "x + y")
const FORMATION_ALIASES: Record<string, FormationId> = {
  "vtc": "vtc",
  "vtc-exam": "vtc",
  "vtc-e-presentiel": "vtc",
  "vtc-e": "vtc-elearning",
  "vtc-elearning": "vtc-elearning",
  "vtc-elearning-1099": "vtc-elearning",
  "taxi": "taxi",
  "taxi-exam": "taxi",
  "taxi-e-presentiel": "taxi",
  "taxi-e": "taxi-elearning",
  "taxi-elearning": "taxi-elearning",
  "ta": "taxi-pour-vtc",
  "ta-e-presentiel": "taxi-pour-vtc",
  "ta-e": "taxi-pour-vtc-elearning",
  "passerelle-taxi": "taxi-pour-vtc",
  "passerelle-taxi-elearning": "taxi-pour-vtc-elearning",
  "va": "vtc-pour-taxi",
  "va-e-presentiel": "vtc-pour-taxi",
  "va-e": "vtc-pour-taxi",
  "passerelle-vtc": "vtc-pour-taxi",
  "passerelle-vtc-elearning": "vtc-pour-taxi",
  "vtc-s": "vtc-cours-du-soir",
  "vtc-cours-du-soir": "vtc-cours-du-soir",
  "continue-vtc": "continue-vtc",
  "pa-vtc": "continue-vtc",
  "formation-continue-vtc": "continue-vtc",
  "continue-taxi": "continue-taxi",
  "pa-taxi": "continue-taxi",
  "formation-continue-taxi": "continue-taxi",
};

export const normalizeFormationKey = (value: string | null | undefined): string =>
  (value || "").split(" + ")[0].trim().toLowerCase().replace(/\s+/g, "-");

const inferFormationFromModules = (modulesAutorises: number[] | null | undefined): FormationId | null => {
  if (!modulesAutorises || modulesAutorises.length === 0) return null;

  const expanded = new Set(expandModulesAutorises(modulesAutorises) || modulesAutorises);
  let best: { id: FormationId; score: number } | null = null;

  for (const formation of FORMATIONS) {
    const formationModuleIds = MODULES_DATA
      .filter((module) => module.formations.includes(formation.id))
      .map((module) => module.id);

    const score = formationModuleIds.reduce((acc, moduleId) => acc + (expanded.has(moduleId) ? 1 : 0), 0);

    if (!best || score > best.score) {
      best = { id: formation.id, score };
    }
  }

  return best && best.score > 0 ? best.id : null;
};

export const resolveFormationId = (
  typeApprenant: string | null | undefined,
  formationChoisie: string | null | undefined,
  modulesAutorises: number[] | null | undefined,
): FormationId | null => {
  // Priority: explicit assigned modules (source of truth for learner access)
  const byModules = inferFormationFromModules(modulesAutorises);
  if (byModules) return byModules;

  const byType = FORMATION_ALIASES[normalizeFormationKey(typeApprenant)];
  if (byType) return byType;

  const byFormation = FORMATION_ALIASES[normalizeFormationKey(formationChoisie)];
  if (byFormation) return byFormation;

  return null;
};

export const FORMATION_DEFAULT_MODULES: Record<FormationId, number[]> = {
  "vtc": [1, 2, 3, 4, 35, 5, 60, 70, 8, 83, 50],
  "vtc-cours-du-soir": [1, 2, 3, 4, 35, 5, 60, 70, 8, 83, 50],
  "vtc-elearning": [26, 2, 3, 4, 35, 5, 60, 70, 8, 50],
  "taxi": [1, 10, 7, 64, 12, 3, 9, 13, 11, 36, 61, 71, 6, 84, 51],
  "taxi-elearning": [26, 10, 7, 64, 12, 3, 9, 13, 11, 36, 61, 71, 6, 51],
  "taxi-pour-vtc": [31, 40, 7, 64, 12, 3, 27, 13, 28, 37, 62, 72, 6, 84, 52],
  "taxi-pour-vtc-elearning": [32, 40, 7, 64, 12, 3, 27, 13, 28, 37, 62, 72, 6, 52],
  "vtc-pour-taxi": [33, 41, 3, 29, 30, 38, 63, 73, 8, 83, 53],
  "continue-vtc": [81, 5, 87, 83, 85, 88, 89],
  "continue-taxi": [82, 11, 92, 84, 86, 93, 94, 95, 96, 51],
  "mobilite-taxi": [90, 84, 86],
};

const MANAGED_MODULE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 50, 51, 52, 53, 60, 61, 62, 63, 64, 70, 71, 72, 73, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 92, 93, 94, 95, 96]);
const DASHBOARD_PARENT_MODULE_IDS: Partial<Record<number, number>> = {
  25: 2,
  14: 2,
  15: 2,
  16: 2,
  17: 2,
  18: 2,
  19: 2,
  39: 10,
  20: 10,
  21: 10,
  22: 10,
  23: 10,
  24: 10,
};

export const normalizeModuleIdForDashboard = (moduleId: number) => DASHBOARD_PARENT_MODULE_IDS[moduleId] ?? moduleId;


/** Same assigned module list as the learner dashboard; no progress or hours inferred. */
export function modulesAttribuesDashboard(formation: FormationId, autorises?: number[] | null) {
  const normalize = (ids: number[]) => [...new Set(ids.map(normalizeModuleIdForDashboard))].filter(id => MANAGED_MODULE_IDS.has(id));
  const assigned = normalize(expandModulesAutorises(autorises) ?? autorises ?? []);
  const defaults = normalize(FORMATION_DEFAULT_MODULES[formation] ?? []);
  const effective = formation === "continue-vtc" || formation === "continue-taxi" ? [...new Set([...assigned, ...defaults])] : assigned;
  const ordered = [...defaults.filter(id => effective.includes(id)), ...effective.filter(id => !defaults.includes(id))];
  const explicit = ordered.map(id => MODULES_DATA.find(m => m.id === id)).filter((m): m is (typeof MODULES_DATA)[number] => !!m && m.formations.includes(formation));
  const fallback = defaults.map(id => MODULES_DATA.find(m => m.id === id)).filter((m): m is (typeof MODULES_DATA)[number] => !!m);
  const modules = explicit.length ? explicit : fallback.length ? fallback : MODULES_DATA.filter(m => m.formations.includes(formation));
  const whitelist = new Set([82, 11, 92, 84, 86, 93, 94, 95, 96, 51]);
  if (formation === "continue-taxi") return modules.filter(m => whitelist.has(m.id));
  // Équipements TAXI (64) absent d'une liste explicite TAXI/TA (formulaires admin antérieurs au 27/10/2026) :
  // ajouté en FIN de liste (aucun module suivant verrouillé), sans écrire modules_autorises.
  if (equipementsTaxiAjoute(formation, autorises)) {
    const m64 = MODULES_DATA.find(m => m.id === MODULE_EQUIPEMENTS_TAXI);
    if (m64 && !modules.some(m => m.id === MODULE_EQUIPEMENTS_TAXI)) return [...modules, m64];
  }
  return modules;
}

export const MODULE_EQUIPEMENTS_TAXI = 64;
/** Instant de la demande (27/10/2026 14:21 UTC) : avant = parcours terminé conservé. */
export const BORNE_EQUIPEMENTS_TAXI_AFFECTATION = "2026-10-27T14:21:00Z";
const FORMATIONS_EQUIPEMENTS_TAXI = new Set<FormationId>(["taxi", "taxi-elearning", "taxi-pour-vtc", "taxi-pour-vtc-elearning"]);

/** Vrai si le module 64 est ajouté par la règle d'affichage (liste explicite non vide qui ne le contient pas). */
export function equipementsTaxiAjoute(formation: FormationId, autorises?: number[] | null): boolean {
  if (!FORMATIONS_EQUIPEMENTS_TAXI.has(formation)) return false;
  const liste = expandModulesAutorises(autorises) ?? autorises ?? [];
  return liste.length > 0 && !liste.map(normalizeModuleIdForDashboard).includes(MODULE_EQUIPEMENTS_TAXI);
}

/**
 * Modules EXIGÉS (jalons, compteurs) : identiques aux modules attribués, sauf le module 64 ajouté par la règle
 * pour un élève dont le parcours était terminé avant la borne (tous les modules attribués validés avant la borne)
 * ou dont l'accès a pris fin avant la borne. Pour eux, le module reste consultable, jamais exigé.
 */
export function modulesExigesDashboard(
  formation: FormationId, autorises: number[] | null | undefined,
  completions: { module_id: number; status?: string | null; completed_at?: string | null }[],
  dateFinAcces?: string | null,
) {
  const modules = modulesAttribuesDashboard(formation, autorises);
  if (!equipementsTaxiAjoute(formation, autorises)) return modules;
  const borne = Date.parse(BORNE_EQUIPEMENTS_TAXI_AFFECTATION);
  if (completions.some(c => normalizeModuleIdForDashboard(Number(c.module_id)) === MODULE_EQUIPEMENTS_TAXI && c.status === "completed")) return modules;
  const finAcces = dateFinAcces ? Date.parse(`${dateFinAcces.slice(0, 10)}T23:59:59Z`) : NaN;
  const autres = modules.filter(m => m.id !== MODULE_EQUIPEMENTS_TAXI);
  const termineAvant = autres.length > 0 && autres.every(m => completions.some(c => normalizeModuleIdForDashboard(Number(c.module_id)) === m.id
    && c.status === "completed" && !!c.completed_at && Date.parse(c.completed_at) < borne));
  return termineAvant || (Number.isFinite(finAcces) && finAcces < borne) ? autres : modules;
}

export const DASHBOARD_PARENT_TO_CHILDREN: Record<number, number[]> = {};
for (const [child, parent] of Object.entries(DASHBOARD_PARENT_MODULE_IDS)) {
  if (parent === undefined) continue;
  (DASHBOARD_PARENT_TO_CHILDREN[parent] ??= []).push(Number(child));
}
