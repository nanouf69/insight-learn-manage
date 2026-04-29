// Bilan Exercices VTC — reprend les exercices du module "2.COURS ET EXERCICES VTC"
// et les regroupe par matière pour garder exactement les mêmes questions/réponses.

import { VTC_COURS_DATA } from "./vtc-cours-data";
import type { ExerciceItem, ExerciceQuestion } from "./exercices/types";

const BILAN_VTC_GROUPS = [
  {
    id: 100,
    titre: "📘 Bilan T3P — Partie 1 + Partie 2",
    sourceIds: [1, 2],
    description: "Réglementation du Transport Public Particulier de Personnes",
  },
  {
    id: 101,
    titre: "📗 Bilan Gestion — Partie 1 + 2 + 3",
    sourceIds: [60, 61, 62],
    description: "Entrepreneurs, Fiscalité, Comptabilité, Organismes",
  },
  {
    id: 102,
    titre: "📙 Bilan Sécurité Routière — Partie 1 + 2 + 3",
    sourceIds: [80, 81, 82],
    description: "Signalisation, Vitesses, Distances, Infractions",
  },
  {
    id: 103,
    titre: "📒 Bilan Français",
    sourceIds: [50],
    description: "Compréhension et expression écrite",
  },
  {
    id: 105,
    titre: "📔 Bilan Anglais — Partie 1 + 2 + 3 + 4",
    sourceIds: [3, 4, 5, 6],
    description: "Expression et compréhension en anglais",
  },
  {
    id: 104,
    titre: "📓 Bilan Développement Commercial",
    sourceIds: [7],
    description: "Marketing, SWOT, PESTEL, Fidélisation, Devis & Facture",
  },
  {
    id: 106,
    titre: "📕 Bilan Réglementation Spécifique VTC",
    sourceIds: [72],
    description: "Registre VTC, Garantie financière, Vignettes, Véhicule, Sanctions",
  },
] as const;

function renumberQuestions(questions: ExerciceQuestion[]) {
  return questions.map((question, index) => ({
    ...question,
    id: index + 1,
    choix: (question.choix || []).map((choice) => ({ ...choice })),
  }));
}

export function buildBilanExercicesVtcFromCours(sourceExercices: ExerciceItem[] = VTC_COURS_DATA.exercices): ExerciceItem[] {
  const sourceById = new Map(sourceExercices.map((exercise) => [Number(exercise.id), exercise]));

  return BILAN_VTC_GROUPS.map((group) => {
    const questions = group.sourceIds.flatMap((sourceId) => sourceById.get(sourceId)?.questions || []);

    return {
      id: group.id,
      titre: group.titre,
      sousTitre: `${questions.length} questions — ${group.description}`,
      actif: true,
      questions: renumberQuestions(questions),
    };
  });
}

export const BILAN_EXERCICES_VTC = buildBilanExercicesVtcFromCours();
