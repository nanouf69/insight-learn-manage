// Bilan Examen TA — 2 matières uniquement (F + G(T)), sans chronomètre

import { bilanExamenTA } from "./examens-blancs-data";

function matiereToExercice(matiere: typeof bilanExamenTA.matieres[0], baseId: number) {
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

export const BILAN_EXAMEN_TA = bilanExamenTA.matieres.map((m, i) =>
  matiereToExercice(m, 700 + i)
);
