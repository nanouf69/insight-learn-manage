// Bilan Exercices TAXI — Regroupe TOUS les exercices par matière (sauf Français, Anglais, Marketing, Réglem. Spécifique VTC)

import { T3P_EXERCICE_PARTIE_1, T3P_EXERCICE_PARTIE_2 } from "./exercices/t3p-exercices-data";
import { GESTION_EXERCICES } from "./exercices/gestion-exercices-data";
import { SECURITE_ROUTIERE_EXERCICES } from "./exercices/securite-routiere-exercices-data";
import {
  REGLEMENTATION_NATIONALE_EXERCICES,
  REGLEMENTATION_LOCALE_EXERCICES,
} from "./exercices/reglementation-exercices-data";

function renumberQuestions(questions: { id: number; enonce: string; choix: any[] }[]) {
  return questions.map((q, i) => ({ ...q, id: i + 1 }));
}

export const BILAN_EXERCICES_TAXI = [
  {
    id: 200,
    titre: "📘 Bilan T3P — Partie 1 + Partie 2",
    sousTitre: `${(T3P_EXERCICE_PARTIE_1.questions?.length || 0) + (T3P_EXERCICE_PARTIE_2.questions?.length || 0)} questions — Réglementation du Transport Public Particulier de Personnes`,
    actif: true,
    questions: renumberQuestions([
      ...(T3P_EXERCICE_PARTIE_1.questions || []),
      ...(T3P_EXERCICE_PARTIE_2.questions || []),
    ]),
  },
  {
    id: 201,
    titre: "📗 Bilan Gestion — Partie 1 + 2 + 3",
    sousTitre: `${GESTION_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — Entrepreneurs, Fiscalité, Comptabilité, Organismes`,
    actif: true,
    questions: renumberQuestions(
      GESTION_EXERCICES.flatMap(e => e.questions || [])
    ),
  },
  {
    id: 202,
    titre: "📙 Bilan Sécurité Routière — Partie 1 + 2 + 3",
    sousTitre: `${SECURITE_ROUTIERE_EXERCICES.reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — Signalisation, Vitesses, Distances, Infractions`,
    actif: true,
    questions: renumberQuestions(
      SECURITE_ROUTIERE_EXERCICES.flatMap(e => e.questions || [])
    ),
  },
  {
    id: 203,
    titre: "📕 Bilan Réglementation — Nationale + Locale",
    sousTitre: `${[...REGLEMENTATION_NATIONALE_EXERCICES, ...REGLEMENTATION_LOCALE_EXERCICES].reduce((acc, e) => acc + (e.questions?.length || 0), 0)} questions — ADS, Carte pro, Tarification, Sanctions, Réglementation Locale`,
    actif: true,
    questions: renumberQuestions(
      [...REGLEMENTATION_NATIONALE_EXERCICES, ...REGLEMENTATION_LOCALE_EXERCICES]
        .flatMap(e => e.questions || [])
    ),
  },
];
