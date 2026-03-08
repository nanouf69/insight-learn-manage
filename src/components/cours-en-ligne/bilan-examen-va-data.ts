// Bilan Examen VA — 2 matières uniquement (F(V) + G(V)), sans chronomètre

import { bilanExamenVA } from "./examens-blancs-data";

function matiereToExercice(matiere: typeof bilanExamenVA.matieres[0], baseId: number) {
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

export const BILAN_EXAMEN_VA = bilanExamenVA.matieres.map((m, i) =>
  matiereToExercice(m, 600 + i)
);
