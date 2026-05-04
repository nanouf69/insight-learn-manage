// Bilan Exercices TAXI — 5 premières matières du Bilan VTC (T3P, Gestion, Sécurité, Français, Anglais)
// + Réglementation Nationale & Locale (spécifique TAXI)

import { T3P_EXERCICE_PARTIE_1, T3P_EXERCICE_PARTIE_2 } from "./exercices/t3p-exercices-data";
import { GESTION_EXERCICES } from "./exercices/gestion-exercices-data";
import { SECURITE_ROUTIERE_EXERCICES } from "./exercices/securite-routiere-exercices-data";
import { FRANCAIS_EXERCICES } from "./exercices/francais-exercices-data";
import { ANGLAIS_EXERCICES } from "./exercices/anglais-exercices-data";
import {
  REGLEMENTATION_NATIONALE_EXERCICES,
  REGLEMENTATION_LOCALE_EXERCICES,
} from "./exercices/reglementation-exercices-data";

function renumberQuestions(questions: { id: number; enonce: string; choix: any[] }[]) {
  return questions.map((q, i) => ({ ...q, id: i + 1 }));
}

// IMPORTANT: Les IDs des bilans communs (T3P, Gestion, Sécurité, Français, Anglais)
// doivent être IDENTIQUES entre VTC (bilan-exercices-vtc-data.ts) et TAXI pour que
// la propagation des modifications admin (syncSharedExercisesToSiblingModules) fonctionne.
// Une édition d'une question dans un bilan se reflète automatiquement dans l'autre.
export const BILAN_EXERCICES_TAXI = [
  {
    id: 100, // aligné avec VTC
    titre: "📘 Bilan T3P — Partie 1 + Partie 2",
    sousTitre: `${(T3P_EXERCICE_PARTIE_1.questions?.length || 0) + (T3P_EXERCICE_PARTIE_2.questions?.length || 0)} questions — Réglementation du Transport Public Particulier de Personnes`,
    actif: true,
    questions: renumberQuestions([
      ...(T3P_EXERCICE_PARTIE_1.questions || []),
      ...(T3P_EXERCICE_PARTIE_2.questions || []),
    ]),
  },
  {
    id: 101, // aligné avec VTC
    titre: "📗 Bilan Gestion — Partie 1 + 2 + 3",
    sousTitre: `${GESTION_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — Entrepreneurs, Fiscalité, Comptabilité, Organismes`,
    actif: true,
    questions: renumberQuestions(
      GESTION_EXERCICES.flatMap(e => e.questions || [])
    ),
  },
  {
    id: 102, // aligné avec VTC — Sécurité Routière partagée
    titre: "📙 Bilan Sécurité Routière — Partie 1 + 2 + 3",
    sousTitre: `${SECURITE_ROUTIERE_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — Signalisation, Vitesses, Distances, Infractions`,
    actif: true,
    questions: renumberQuestions(
      SECURITE_ROUTIERE_EXERCICES.flatMap(e => e.questions || [])
    ),
  },
  {
    id: 103, // aligné avec VTC
    titre: "📒 Bilan Français",
    sousTitre: `${FRANCAIS_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — Compréhension et expression écrite`,
    actif: true,
    questions: renumberQuestions(
      FRANCAIS_EXERCICES.flatMap(e => e.questions || [])
    ),
  },
  {
    id: 105, // aligné avec VTC
    titre: "📔 Bilan Anglais — Partie 1 + 2 + 3 + 4",
    sousTitre: `${ANGLAIS_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — Expression et compréhension en anglais`,
    actif: true,
    questions: renumberQuestions(
      ANGLAIS_EXERCICES.flatMap(e => e.questions || [])
    ),
  },
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
