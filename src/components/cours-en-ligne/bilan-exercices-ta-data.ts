// Bilan Exercices TA — uniquement Réglementation Nationale + Locale

import {
  REGLEMENTATION_NATIONALE_EXERCICES,
  REGLEMENTATION_LOCALE_EXERCICES,
} from "./exercices/reglementation-exercices-data";

function renumberQuestions(questions: { id: number; enonce: string; choix: any[] }[]) {
  return questions.map((q, i) => ({ ...q, id: i + 1 }));
}

export const BILAN_EXERCICES_TA = [
  {
    id: 203,
    titre: "📕 Bilan Réglementation Nationale",
    sousTitre: `${REGLEMENTATION_NATIONALE_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — ADS, Carte pro, Tarification, Sanctions`,
    actif: true,
    questions: renumberQuestions(
      REGLEMENTATION_NATIONALE_EXERCICES.flatMap((e) => e.questions || []),
    ),
  },
  {
    id: 204,
    titre: "📕 Bilan Réglementation Locale",
    sousTitre: `${REGLEMENTATION_LOCALE_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — Réglementation Locale Lyon`,
    actif: true,
    questions: renumberQuestions(
      REGLEMENTATION_LOCALE_EXERCICES.flatMap((e) => e.questions || []),
    ),
  },
];
