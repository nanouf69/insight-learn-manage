/** Explicit individual display dispensations; never manufacture server completions or answers. */
export interface ExceptionModulesEleve {
  activitesDispensees: readonly string[];
  rubriquesHorsCompteur: readonly number[];
}

const EXCEPTIONS: Readonly<Record<string, ExceptionModulesEleve>> = {
  "bf12b32a-f8a2-434c-b855-f6033de38c2f": {
    activitesDispensees: ["jeu_lyon_arrondissements_quartiers", "jeu_lyon_lieux"],
    // Attendance archive is not a pedagogical achievement; no signature is validated here.
    rubriquesHorsCompteur: [83],
  },
};

export function exceptionModulesEleve(apprenantId?: string | null): ExceptionModulesEleve | undefined {
  return apprenantId ? EXCEPTIONS[apprenantId] : undefined;
}