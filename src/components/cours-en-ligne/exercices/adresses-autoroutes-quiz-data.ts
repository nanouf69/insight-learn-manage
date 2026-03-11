import { ExerciceItem } from "./types";

export const QUIZ_AUTOROUTES: ExerciceItem = {
  id: 7009, actif: true,
  titre: "Quiz — Adresses Autoroutes",
  sousTitre: "10 questions sur les autoroutes traversant le Rhône",
  questions: [
    {
      id: 1, enonce: "Quelle autoroute relie Lyon (Limonest) à Paris (Wissous) ?",
      choix: [
        { lettre: "A", texte: "A6", correct: true },
        { lettre: "B", texte: "A7" },
        { lettre: "C", texte: "A43" },
        { lettre: "D", texte: "A42" },
      ],
    },
    {
      id: 2, enonce: "Quelle autoroute relie Lyon à Bourg-en-Bresse ?",
      choix: [
        { lettre: "A", texte: "A42", correct: true },
        { lettre: "B", texte: "A6" },
        { lettre: "C", texte: "A89" },
        { lettre: "D", texte: "A40" },
      ],
    },
    {
      id: 3, enonce: "Quelle autoroute relie Lyon à Chambéry et à l'Italie via le Tunnel du Fréjus ?",
      choix: [
        { lettre: "A", texte: "A43", correct: true },
        { lettre: "B", texte: "A42" },
        { lettre: "C", texte: "A40" },
        { lettre: "D", texte: "A6" },
      ],
    },
    {
      id: 4, enonce: "Quelle autoroute relie Pierre-Bénite (Lyon) à Marseille ?",
      choix: [
        { lettre: "A", texte: "A7", correct: true },
        { lettre: "B", texte: "A6" },
        { lettre: "C", texte: "A9" },
        { lettre: "D", texte: "A75" },
      ],
    },
    {
      id: 5, enonce: "Quelle autoroute relie Bordeaux à Lyon (Limonest) ?",
      choix: [
        { lettre: "A", texte: "A89", correct: true },
        { lettre: "B", texte: "A6" },
        { lettre: "C", texte: "A71" },
        { lettre: "D", texte: "A43" },
      ],
    },
    {
      id: 6, enonce: "Quelle autoroute relie Mâcon à Passy (proximité de Genève) et se prolonge jusqu'à Chamonix ?",
      choix: [
        { lettre: "A", texte: "A40", correct: true },
        { lettre: "B", texte: "A42" },
        { lettre: "C", texte: "A43" },
        { lettre: "D", texte: "A6" },
      ],
    },
    {
      id: 7, enonce: "L'A450 relie quelles communes ?",
      choix: [
        { lettre: "A", texte: "Brignais et Pierre-Bénite", correct: true },
        { lettre: "B", texte: "Lyon et Vienne" },
        { lettre: "C", texte: "Villeurbanne et Vaulx-en-Velin" },
        { lettre: "D", texte: "Écully et Tassin" },
      ],
    },
    {
      id: 8, enonce: "Quelle autoroute relie Orléans à Clermont-Ferrand ?",
      choix: [
        { lettre: "A", texte: "A71", correct: true },
        { lettre: "B", texte: "A75" },
        { lettre: "C", texte: "A89" },
        { lettre: "D", texte: "A6" },
      ],
    },
    {
      id: 9, enonce: "Quelle autoroute relie Clermont-Ferrand à Béziers dans le prolongement de l'A71 ?",
      choix: [
        { lettre: "A", texte: "A75", correct: true },
        { lettre: "B", texte: "A71" },
        { lettre: "C", texte: "A9" },
        { lettre: "D", texte: "A7" },
      ],
    },
    {
      id: 10, enonce: "Combien d'autoroutes traversent le département du Rhône ?",
      choix: [
        { lettre: "A", texte: "6", correct: true },
        { lettre: "B", texte: "4" },
        { lettre: "C", texte: "8" },
        { lettre: "D", texte: "10" },
      ],
    },
  ],
};
