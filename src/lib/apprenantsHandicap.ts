// Apprenants signalés par l'administration comme en situation de handicap (affichage uniquement).
const APPRENANTS_HANDICAP = new Set<string>([
  "06909378-3c16-4852-bb0c-f6eb823ea4f7", // BOUTARFI Ahmed — demande admin 10/11/2026
]);

export const estApprenantHandicap = (id?: string | null) => !!id && APPRENANTS_HANDICAP.has(id);
