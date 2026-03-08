// Bilan Exercices VA — version allégée (sans T3P, Gestion, Sécurité routière)

import { BILAN_EXERCICES_VTC } from "./bilan-exercices-vtc-data";

const EXCLUDED_MODULE_IDS = new Set([100, 101, 102]);

export const BILAN_EXERCICES_VA = BILAN_EXERCICES_VTC
  .filter((module) => !EXCLUDED_MODULE_IDS.has(module.id))
  .map((module) => ({
    ...module,
    questions: (module.questions || []).map((question, index) => ({
      ...question,
      id: index + 1,
    })),
  }));
