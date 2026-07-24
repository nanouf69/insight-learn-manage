// Bilan Exercices Formation Continue TAXI
// Matières incluses : T3P (100), Sécurité Routière (102),
// Réglementation Nationale (203), Réglementation Locale (204),
// et Développement Commercial (104, repris depuis le Bilan VTC).
// Exclus : Gestion (101), Français (103), Anglais (105).

import { BILAN_EXERCICES_TAXI } from "./bilan-exercices-taxi-data";
import { BILAN_EXERCICES_VTC } from "./bilan-exercices-vtc-data";

const EXCLUDED_MODULE_IDS = new Set([101, 103, 105]);

const baseTaxi = BILAN_EXERCICES_TAXI.filter((module) => !EXCLUDED_MODULE_IDS.has(module.id));

// Ajout du Bilan Développement Commercial (id 104) issu du Bilan VTC
const devCommercialVtc = BILAN_EXERCICES_VTC.find((m) => m.id === 104);
const withDevCommercial = devCommercialVtc
  ? [...baseTaxi, JSON.parse(JSON.stringify(devCommercialVtc))]
  : baseTaxi;

export const BILAN_EXERCICES_FC_TAXI = withDevCommercial.map((module) => ({
  ...module,
  questions: (module.questions || []).map((question, index) => ({
    ...question,
    id: index + 1,
  })),
}));
