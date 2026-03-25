// Bilan Exercices Formation Continue VTC — Sans Gestion, Français, Anglais
// (Français et Anglais ne sont déjà pas dans le bilan VTC standard)

import { BILAN_EXERCICES_VTC } from "./bilan-exercices-vtc-data";

// Exclure Gestion (id 101)
const EXCLUDED_MODULE_IDS = new Set([101]);

export const BILAN_EXERCICES_FC_VTC = BILAN_EXERCICES_VTC
  .filter((module) => !EXCLUDED_MODULE_IDS.has(module.id))
  .map((module) => ({
    ...module,
    questions: (module.questions || []).map((question, index) => ({
      ...question,
      id: index + 1,
    })),
  }));
