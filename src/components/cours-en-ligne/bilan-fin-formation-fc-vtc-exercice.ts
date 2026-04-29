// Conversion du bilan fin de formation FC VTC en ExerciceItem (format quiz interactif)
// pour qu'il soit utilisable comme un module quiz standard (module 87).

import type { ExerciceItem } from "./exercices/types";
import { BILAN_FIN_FORMATION_FC_VTC } from "./bilan-fin-formation-fc-vtc-data";

const LETTRES = ["A", "B", "C", "D", "E", "F", "G", "H"];

export const BILAN_FIN_FORMATION_FC_VTC_EXERCICE: ExerciceItem[] = [
  {
    id: 200,
    titre: "📋 Bilan fin de formation — Formation Continue VTC",
    sousTitre: `${BILAN_FIN_FORMATION_FC_VTC.length} questions — sélectionnez la (ou les) bonne(s) réponse(s)`,
    actif: true,
    questions: BILAN_FIN_FORMATION_FC_VTC.map((q, idx) => ({
      id: idx + 1,
      enonce: q.enonce,
      image: q.image,
      choix: q.choix.map((c, i) => ({
        lettre: LETTRES[i] ?? String(i + 1),
        texte: c.texte,
        correct: c.correct === true,
      })),
    })),
  },
];
