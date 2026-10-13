import { computeServerCompletedModuleIds, type CompletionLite } from "@/lib/moduleUnlockLogic";
import { DASHBOARD_PARENT_TO_CHILDREN, normalizeModuleIdForDashboard } from "@/lib/parcoursModulesDashboard";
import { JEUX_LYON } from "@/lib/jeuxPedagogiques";

/** Explicit individual display dispensations; never manufacture server completions or answers. */
export interface ExceptionModulesEleve {
  activitesDispensees: readonly string[];
  rubriquesHorsCompteur: readonly number[];
}

const EXCEPTIONS: Readonly<Record<string, ExceptionModulesEleve>> = {
  "4c75ae96-9d4d-4c6f-8097-dd59d27fe9f5": {
    activitesDispensees: ["jeu_lyon_arrondissements_quartiers", "jeu_lyon_lieux"],
    rubriquesHorsCompteur: [],
  },
  "bf12b32a-f8a2-434c-b855-f6033de38c2f": {
    activitesDispensees: ["jeu_lyon_arrondissements_quartiers", "jeu_lyon_lieux"],
    // Attendance archive is not a pedagogical achievement; no signature is validated here.
    rubriquesHorsCompteur: [83],
  },
};

export function exceptionModulesEleve(apprenantId?: string | null): ExceptionModulesEleve | undefined {
  return apprenantId ? EXCEPTIONS[apprenantId] : undefined;
}

/** Shared waiver IDs, not completed answers. No cached cross-account state. */
export function activitesDispenseesPourParcours(modules: readonly { id: number }[], completions: readonly CompletionLite[], apprenantId?: string | null): Set<string> {
  return new Set([...jeuxLyonDispensesParHistorique(modules, completions), ...(exceptionModulesEleve(apprenantId)?.activitesDispensees ?? [])]);
}

/** Only these two games are waived when the entire pedagogical path was already done.
 * Attendance archives are not pedagogical modules, but remain in the existing counter.
 * Missing/invalid dates and intermediate states never establish a past completion.
 */
export function jeuxLyonDispensesParHistorique(
  modules: readonly { id: number }[],
  completions: readonly CompletionLite[] = [],
): Set<string> {
  const pedagogiques = [...new Set(modules.map(m => Number(m.id)))].filter(id => id !== 83 && id !== 84);
  if (!pedagogiques.length || !pedagogiques.includes(8)) return new Set();
  return new Set(JEUX_LYON.filter(jeu => {
    const limite = Date.parse(jeu.ajouteeLe);
    const anterieures = completions.filter(row => row.status === "completed" &&
      !!row.completed_at && Number.isFinite(Date.parse(row.completed_at)) && Date.parse(row.completed_at) < limite);
    const termines = computeServerCompletedModuleIds(anterieures, DASHBOARD_PARENT_TO_CHILDREN, normalizeModuleIdForDashboard);
    return pedagogiques.every(id => termines.has(id));
  }).map(jeu => jeu.id));
}