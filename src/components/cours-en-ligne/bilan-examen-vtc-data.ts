// Bilan Examen VTC — 7 matières séparées, sans chronomètre
// Réutilise les données existantes de examens-blancs-data.ts

import { bilanExamenVTC } from "./examens-blancs-data";

function matiereToExercice(matiere: typeof bilanExamenVTC.matieres[0], baseId: number) {
  return {
    id: baseId,
    titre: `📝 ${matiere.nom}`,
    sousTitre: `${matiere.questions.length} questions — Bilan Examen`,
    actif: true,
    questions: matiere.questions.map((q, i) => ({
      id: i + 1,
      enonce: q.enonce,
      choix: q.choix || [],
    })),
  };
}

export const BILAN_EXAMEN_VTC = bilanExamenVTC.matieres.map((m, i) =>
  matiereToExercice(m, 500 + i)
);
