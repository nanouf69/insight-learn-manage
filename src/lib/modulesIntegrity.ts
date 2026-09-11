// Contrôle d'intégrité des modules attribués aux apprenants.
// Objectif : détecter automatiquement les apprenants à qui il manque un module
// prévu par leur parcours (ex. "CAS PRATIQUE TAXI" absent chez des TA).
// Lecture seule : aucune donnée apprenant (notes, tentatives, progression) n'est touchée.

import { DEFAULT_MODULES_BY_TYPE } from "@/components/cours-en-ligne/modules-config";

const FORMATION_TO_TYPE: Record<string, string> = {
  vtc: "vtc",
  "vtc-exam": "vtc",
  taxi: "taxi",
  "taxi-exam": "taxi",
  "passerelle-taxi": "ta",
  "vtc-elearning-1099": "vtc-e",
  "vtc-elearning": "vtc-e",
  "taxi-elearning": "taxi-e",
  "passerelle-taxi-elearning": "ta-e",
  "passerelle-vtc-elearning": "va-e",
  "vtc-e-presentiel": "vtc-e-presentiel",
  "taxi-e-presentiel": "taxi-e-presentiel",
  "ta-e-presentiel": "ta-e-presentiel",
  "continue-vtc": "continue-vtc",
  "continue-taxi": "continue-taxi",
  "mobilite-taxi": "mobilite-taxi",
};

export interface ApprenantModulesLite {
  type_apprenant?: string | null;
  formation_choisie?: string | null;
  modules_autorises?: number[] | null;
}

/** Déduit la clé de parcours (vtc, taxi-e, ta, ...) d'un apprenant. */
export function resolveFormationTypeKey(a: ApprenantModulesLite): string {
  const primary = ((a?.type_apprenant || "") as string).split(" + ")[0].toLowerCase().trim();
  if (primary && DEFAULT_MODULES_BY_TYPE[primary]) return primary;
  const formation = ((a?.formation_choisie || "") as string).split(" + ")[0].toLowerCase().trim();
  const mapped = FORMATION_TO_TYPE[formation];
  if (mapped && DEFAULT_MODULES_BY_TYPE[mapped]) return mapped;
  if (primary && FORMATION_TO_TYPE[primary]) return FORMATION_TO_TYPE[primary];
  return "";
}

/**
 * Retourne les IDs de modules prévus par le parcours mais absents de la liste
 * de l'apprenant. Ne propose jamais de retirer un module existant.
 */
export function findMissingModules(a: ApprenantModulesLite): {
  typeKey: string;
  expected: number[];
  missing: number[];
} {
  const typeKey = resolveFormationTypeKey(a);
  const expected = DEFAULT_MODULES_BY_TYPE[typeKey] || [];
  const current = Array.isArray(a?.modules_autorises)
    ? a.modules_autorises.map((m) => Number(m)).filter((m) => Number.isFinite(m))
    : [];
  // Si l'apprenant n'a aucun module, c'est déjà signalé par le statut "Aucun module".
  const missing = current.length === 0 ? [] : expected.filter((id) => !current.includes(id));
  return { typeKey, expected, missing };
}

/** Liste fusionnée (existants + manquants), triée, sans doublon. */
export function mergeMissingModules(current: number[] | null | undefined, missing: number[]): number[] {
  const set = new Set<number>([...(current ?? []).map(Number), ...missing]);
  return Array.from(set).sort((x, y) => x - y);
}
