// Bilan Examen TAXI — 7 matières séparées, sans chronomètre
// Réutilise les données existantes de examens-blancs-data.ts

import { bilanExamenTaxi } from "./examens-blancs-data";

function matiereToExercice(matiere: typeof bilanExamenTaxi.matieres[0], baseId: number) {
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

export const BILAN_EXAMEN_TAXI = bilanExamenTaxi.matieres.map((m, i) =>
  matiereToExercice(m, 600 + i)
);
