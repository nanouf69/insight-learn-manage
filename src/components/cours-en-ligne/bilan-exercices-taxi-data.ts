// Bilan Exercices TAXI — reprend EXACTEMENT les 5 bilans communs du Bilan VTC
// (T3P, Gestion, Sécurité Routière, Français, Anglais) construits depuis VTC_COURS_DATA
// + Réglementation Nationale & Locale (spécifique TAXI)

import { BILAN_EXERCICES_VTC } from "./bilan-exercices-vtc-data";
import {
  REGLEMENTATION_NATIONALE_EXERCICES,
  REGLEMENTATION_LOCALE_EXERCICES,
} from "./exercices/reglementation-exercices-data";

function renumberQuestions(questions: { id: number; enonce: string; choix: any[] }[]) {
  return questions.map((q, i) => ({ ...q, id: i + 1 }));
}

// IMPORTANT: Les 5 bilans communs sont récupérés DIRECTEMENT depuis BILAN_EXERCICES_VTC
// via leurs IDs (100=T3P, 101=Gestion, 102=Sécurité Routière, 103=Français, 105=Anglais).
// Ainsi questions, réponses et images sont strictement identiques entre VTC et TAXI,
// et toute édition admin se propage automatiquement (via syncSharedExercisesToSiblingModules).
const SHARED_IDS_FROM_VTC = [100, 101, 102, 103, 105];

const sharedFromVtc = SHARED_IDS_FROM_VTC
  .map((id) => BILAN_EXERCICES_VTC.find((b) => b.id === id))
  .filter((b): b is NonNullable<typeof b> => Boolean(b))
  // deep clone pour éviter toute mutation partagée
  .map((b) => JSON.parse(JSON.stringify(b)));

export const BILAN_EXERCICES_TAXI = [
  ...sharedFromVtc,
  {
    id: 203,
    titre: "📕 Bilan Réglementation Nationale",
    sousTitre: `${REGLEMENTATION_NATIONALE_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — ADS, Carte pro, Tarification, Sanctions`,
    actif: true,
    questions: renumberQuestions(
      REGLEMENTATION_NATIONALE_EXERCICES.flatMap(e => e.questions || [])
    ),
  },
  {
    id: 204,
    titre: "📕 Bilan Réglementation Locale",
    sousTitre: `${REGLEMENTATION_LOCALE_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — Réglementation Locale Lyon`,
    actif: true,
    questions: renumberQuestions(
      REGLEMENTATION_LOCALE_EXERCICES.flatMap(e => e.questions || [])
    ),
  },
];
