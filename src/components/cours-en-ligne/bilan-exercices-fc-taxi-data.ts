// Bilan Exercices Formation Continue TAXI — Sans Gestion
// Basé sur BILAN_EXERCICES_TAXI dont on exclut le bilan Gestion (id 101)

import { BILAN_EXERCICES_TAXI } from "./bilan-exercices-taxi-data";

const EXCLUDED_MODULE_IDS = new Set([101]);

export const BILAN_EXERCICES_FC_TAXI = BILAN_EXERCICES_TAXI
  .filter((module) => !EXCLUDED_MODULE_IDS.has(module.id))
  .map((module) => ({
    ...module,
    questions: (module.questions || []).map((question, index) => ({
      ...question,
      id: index + 1,
    })),
  }));
