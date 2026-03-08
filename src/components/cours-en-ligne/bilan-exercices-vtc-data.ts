// Bilan Exercices VTC — Regroupe TOUS les exercices par matière (sauf Français et Anglais)
// Chaque matière combine toutes ses parties en un seul grand quiz

import { T3P_EXERCICE_PARTIE_1, T3P_EXERCICE_PARTIE_2 } from "./exercices/t3p-exercices-data";
import { GESTION_EXERCICES } from "./exercices/gestion-exercices-data";
import { SECURITE_ROUTIERE_EXERCICES } from "./exercices/securite-routiere-exercices-data";
import {
  REGLEMENTATION_SPECIFIQUE_VTC_EXERCICES,
} from "./exercices/reglementation-exercices-data";
import { DEV_COMMERCIAL_EXERCICE } from "./exercices/dev-commercial-exercices-data";

function renumberQuestions(questions: { id: number; enonce: string; choix: any[] }[]) {
  return questions.map((q, i) => ({ ...q, id: i + 1 }));
}

export const BILAN_EXERCICES_VTC = [
  {
    id: 100,
    titre: "📘 Bilan T3P — Partie 1 + Partie 2",
    sousTitre: `${(T3P_EXERCICE_PARTIE_1.questions?.length || 0) + (T3P_EXERCICE_PARTIE_2.questions?.length || 0)} questions — Réglementation du Transport Public Particulier de Personnes`,
    actif: true,
    questions: renumberQuestions([
      ...(T3P_EXERCICE_PARTIE_1.questions || []),
      ...(T3P_EXERCICE_PARTIE_2.questions || []),
    ]),
  },
  {
    id: 101,
    titre: "📗 Bilan Gestion — Partie 1 + 2 + 3",
    sousTitre: `${GESTION_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — Entrepreneurs, Fiscalité, Comptabilité, Organismes`,
    actif: true,
    questions: renumberQuestions(
      GESTION_EXERCICES.flatMap(e => e.questions || [])
    ),
  },
  {
    id: 102,
    titre: "📙 Bilan Sécurité Routière — Partie 1 + 2 + 3",
    sousTitre: `${SECURITE_ROUTIERE_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — Signalisation, Vitesses, Distances, Infractions`,
    actif: true,
    questions: renumberQuestions(
      SECURITE_ROUTIERE_EXERCICES.flatMap(e => e.questions || [])
    ),
  },
  {
    id: 104,
    titre: "📓 Bilan Développement Commercial",
    sousTitre: `${DEV_COMMERCIAL_EXERCICE.questions?.length || 0} questions — Marketing, SWOT, PESTEL, Fidélisation, Devis & Facture`,
    actif: true,
    questions: renumberQuestions(DEV_COMMERCIAL_EXERCICE.questions || []),
  },
  {
    id: 106,
    titre: "📕 Bilan Réglementation Spécifique VTC",
    sousTitre: `${REGLEMENTATION_SPECIFIQUE_VTC_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — Registre VTC, Garantie financière, Vignettes, Véhicule, Sanctions`,
    actif: true,
    questions: renumberQuestions(
      REGLEMENTATION_SPECIFIQUE_VTC_EXERCICES.flatMap(e => e.questions || [])
    ),
  },
];
