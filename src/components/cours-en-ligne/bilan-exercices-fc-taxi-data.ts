// Bilan Exercices Formation Continue TAXI
// Matières incluses : T3P (100), Sécurité Routière (102),
// Réglementation Nationale (203) et Réglementation Locale (204).
// Exclus : Gestion (101), Français (103), Anglais (105).

import { BILAN_EXERCICES_TAXI } from "./bilan-exercices-taxi-data";

const EXCLUDED_MODULE_IDS = new Set([101, 103, 105]);

export const BILAN_EXERCICES_FC_TAXI = BILAN_EXERCICES_TAXI
  .filter((module) => !EXCLUDED_MODULE_IDS.has(module.id))
  .map((module) => ({
    ...module,
    questions: (module.questions || []).map((question, index) => ({
      ...question,
      id: index + 1,
    })),
  }));
