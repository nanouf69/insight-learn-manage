// ===== Quiz interactifs — Connaissance de la ville TAXI =====
// Extraits des documents Word d'adresses

import { ExerciceItem } from "./types";

// =============================================
// QUIZ 1 — ADMINISTRATIONS
// =============================================
export const QUIZ_ADMINISTRATIONS: ExerciceItem = {
  id: 7001, actif: true,
  titre: "Quiz Adresses Administrations",
  sousTitre: "16 questions sur les adresses des administrations lyonnaises",
  questions: [
    {
      id: 1, enonce: "Où se trouve l'adresse des Anciens Combattants ?",
      choix: [
        { lettre: "A", texte: "3 Rue Louis Vitet, Lyon", correct: true },
        { lettre: "B", texte: "2 Rue du Michlet, Lyon" },
        { lettre: "C", texte: "20 Boulevard des États-Unis, Lyon" },
        { lettre: "D", texte: "3 Rue Foch, Lyon" },
      ],
    },
    {
      id: 2, enonce: "Où se trouve la Direction Régionale des Affaires Culturelles Rhône-Alpes ?",
      choix: [
        { lettre: "A", texte: "Le Grenier d'Abondance, 6 Quai Saint-Vincent, Lyon", correct: true },
        { lettre: "B", texte: "2 Rue du Michlet, Lyon" },
        { lettre: "C", texte: "3 Rue Foch, Lyon" },
        { lettre: "D", texte: "3 Rue Saint-Jean, Lyon" },
      ],
    },
    {
      id: 3, enonce: "Où se trouve la Cour Administrative d'Appel ?",
      choix: [
        { lettre: "A", texte: "184 Rue Duguesclin, Lyon", correct: true },
        { lettre: "B", texte: "33 Rue Magenta, Lyon" },
        { lettre: "C", texte: "Le Grenier d'Abondance, 6 Quai Saint-Vincent, Lyon" },
        { lettre: "D", texte: "3 Rue Saint-Jean, Lyon" },
      ],
    },
    {
      id: 4, enonce: "Où se trouve l'École Normale Supérieure de Lyon – site Descartes ?",
      choix: [
        { lettre: "A", texte: "15 Parvis René Descartes, Lyon", correct: true },
        { lettre: "B", texte: "Le Grenier d'Abondance, 6 Quai Saint-Vincent, Lyon" },
        { lettre: "C", texte: "9 Rue Dumont, Lyon" },
        { lettre: "D", texte: "11 Rue Mercière, Lyon" },
      ],
    },
    {
      id: 5, enonce: "Où se trouve l'Église Saint-Nizier ?",
      choix: [
        { lettre: "A", texte: "Place Saint-Nizier, Lyon", correct: true },
        { lettre: "B", texte: "15 Parvis René Descartes, Lyon" },
        { lettre: "C", texte: "Le Grenier d'Abondance, 6 Quai Saint-Vincent, Lyon" },
        { lettre: "D", texte: "11 Rue Mercière, Lyon" },
      ],
    },
    {
      id: 6, enonce: "Où se trouve la Mairie de Lyon 1 ?",
      choix: [
        { lettre: "A", texte: "2 Place Sathonay, Lyon", correct: true },
        { lettre: "B", texte: "1 Rue de la République, Lyon" },
        { lettre: "C", texte: "Le Grenier d'Abondance, 6 Quai Saint-Vincent, Lyon" },
        { lettre: "D", texte: "15 Rue du Commerce, Lyon" },
      ],
    },
    {
      id: 7, enonce: "Où se trouve la Mairie de Lyon 4 ?",
      choix: [
        { lettre: "A", texte: "133 Boulevard de la Croix-Rousse, Lyon", correct: true },
        { lettre: "B", texte: "1 Rue de la République, Lyon" },
        { lettre: "C", texte: "2 Place Sathonay, Lyon" },
        { lettre: "D", texte: "15 Place George Sand, Lyon" },
      ],
    },
    {
      id: 8, enonce: "Où se trouve le Commissariat du 1er arrondissement ?",
      choix: [
        { lettre: "A", texte: "5 Rue de la Martinière, Lyon", correct: true },
        { lettre: "B", texte: "19 Place Louis Pradel, Lyon" },
        { lettre: "C", texte: "20 Boulevard des États-Unis, Lyon" },
        { lettre: "D", texte: "15 Place George Sand, Lyon" },
      ],
    },
    {
      id: 9, enonce: "Où se trouve le Commissariat de Saint-Priest ?",
      choix: [
        { lettre: "A", texte: "13 Rue Docteur Gallavardin, Saint-Priest", correct: true },
        { lettre: "B", texte: "19 Place Louis Pradel, Lyon" },
        { lettre: "C", texte: "20 Boulevard des États-Unis, Lyon" },
        { lettre: "D", texte: "2 Place Sathonay, Lyon" },
      ],
    },
    {
      id: 10, enonce: "Où se trouve la Clinique Saint-Charles ?",
      choix: [
        { lettre: "A", texte: "25 Rue de Flesselles, Lyon", correct: true },
        { lettre: "B", texte: "19 Place Louis Pradel, Lyon" },
        { lettre: "C", texte: "2 Place Sathonay, Lyon" },
        { lettre: "D", texte: "13 Rue Docteur Gallavardin, Lyon" },
      ],
    },
    {
      id: 11, enonce: "Où se trouve la Clinique du Val d'Ouest ?",
      choix: [
        { lettre: "A", texte: "39 Chemin de la Vernique, Écully", correct: true },
        { lettre: "B", texte: "19 Place Louis Pradel, Lyon" },
        { lettre: "C", texte: "25 Rue de Flesselles, Lyon" },
        { lettre: "D", texte: "14 Cours de Verdun, Lyon" },
      ],
    },
    {
      id: 12, enonce: "Où se trouve la Gare SNCF de Perrache ?",
      choix: [
        { lettre: "A", texte: "14 Cours de Verdun, Lyon", correct: true },
        { lettre: "B", texte: "19 Place Louis Pradel, Lyon" },
        { lettre: "C", texte: "25 Rue de Flesselles, Lyon" },
        { lettre: "D", texte: "9 Rue Paul Bert, Lyon" },
      ],
    },
    {
      id: 13, enonce: "Où se trouve le Musée des Beaux-Arts ?",
      choix: [
        { lettre: "A", texte: "20 Place des Terreaux, Lyon", correct: true },
        { lettre: "B", texte: "25 Rue de Flesselles, Lyon" },
        { lettre: "C", texte: "55 Rue Franklin, Lyon" },
        { lettre: "D", texte: "9 Rue Paul Bert, Lyon" },
      ],
    },
    {
      id: 14, enonce: "Où se trouve la Maison des Canuts / Musée des Tissages ?",
      choix: [
        { lettre: "A", texte: "10 Rue d'Ivry, Lyon", correct: true },
        { lettre: "B", texte: "89 Rue Saint-Antoine, Lyon" },
        { lettre: "C", texte: "9 Rue Paul Bert, Lyon" },
        { lettre: "D", texte: "6 Rue Gambetta, Lyon" },
      ],
    },
    {
      id: 15, enonce: "Où se trouve La Mère Brazier ?",
      choix: [
        { lettre: "A", texte: "12 Rue Royale, Lyon", correct: true },
        { lettre: "B", texte: "24 Rue Duban, Lyon" },
        { lettre: "C", texte: "9 Rue Paul Bert, Lyon" },
        { lettre: "D", texte: "6 Rue Gambetta, Lyon" },
      ],
    },
    {
      id: 16, enonce: "Où se trouve l'Auditorium Orchestre National ?",
      choix: [
        { lettre: "A", texte: "149 Rue Garibaldi, Lyon", correct: true },
        { lettre: "B", texte: "1 Rue Belhomme, Lyon" },
        { lettre: "C", texte: "9 Place Colbert, Lyon" },
        { lettre: "D", texte: "10 Rue de la République, Lyon" },
      ],
    },
  ],
};

// =============================================
// QUIZ 2 — CONSULATS
// =============================================
export const QUIZ_CONSULATS: ExerciceItem = {
  id: 7002, actif: true,
  titre: "Quiz Adresses Consulats",
  sousTitre: "20 questions sur les consulats de Lyon",
  questions: [
    {
      id: 1, enonce: "Où se trouve le Consulat de Belgique ?",
      choix: [
        { lettre: "A", texte: "8 Rue de la République, Lyon" },
        { lettre: "B", texte: "15 Place George Sand, Lyon" },
        { lettre: "C", texte: "46 Rue Gambetta, Lyon", correct: true },
        { lettre: "D", texte: "18 Rue Magenta, Lyon" },
      ],
    },
    {
      id: 2, enonce: "Où se trouve le Consulat de Norvège ?",
      choix: [
        { lettre: "A", texte: "26 Rue Gambetta, Lyon" },
        { lettre: "B", texte: "1 Rue Michelet, Lyon", correct: true },
        { lettre: "C", texte: "3 Rue Dumont, Lyon" },
        { lettre: "D", texte: "99 Rue du Commerce, Lyon" },
      ],
    },
    {
      id: 3, enonce: "Où se trouve le Consulat des États-Unis ?",
      choix: [
        { lettre: "A", texte: "5 Rue de la République, Lyon" },
        { lettre: "B", texte: "10 Rue de Marseille, Lyon" },
        { lettre: "C", texte: "7 Rue Gambetta, Lyon" },
        { lettre: "D", texte: "1 Quai Jules Courmont, Lyon", correct: true },
      ],
    },
    {
      id: 4, enonce: "Où se trouve le Consulat du Luxembourg ?",
      choix: [
        { lettre: "A", texte: "5 Rue de France, Lyon" },
        { lettre: "B", texte: "10 Place George Sand, Lyon" },
        { lettre: "C", texte: "6 Rue Grolée, Lyon", correct: true },
        { lettre: "D", texte: "22 Rue des Dahlias, Lyon" },
      ],
    },
    {
      id: 5, enonce: "Où se trouve le Consulat du Mexique ?",
      choix: [
        { lettre: "A", texte: "6 Place Bellecour, Lyon" },
        { lettre: "B", texte: "10 Place George Sand, Lyon" },
        { lettre: "C", texte: "18 Rue Antoine de Saint-Exupéry, Lyon", correct: true },
        { lettre: "D", texte: "22 Rue des Dahlias, Lyon" },
      ],
    },
    {
      id: 6, enonce: "Où se trouve le Consulat du Maroc ?",
      choix: [
        { lettre: "A", texte: "5 Rue du Lac, Lyon" },
        { lettre: "B", texte: "58 Rue du Repos, Lyon" },
        { lettre: "C", texte: "56 Rue Jeanne Hachette, Lyon" },
        { lettre: "D", texte: "2/4 Rue Carry, Lyon", correct: true },
      ],
    },
    {
      id: 7, enonce: "Où se trouve le Consulat de Slovaquie ?",
      choix: [
        { lettre: "A", texte: "50 Rue Jeanne Hachette, Lyon" },
        { lettre: "B", texte: "121 Cours du Dr Long, Lyon", correct: true },
        { lettre: "C", texte: "64 Rue de Créqui, Lyon" },
        { lettre: "D", texte: "56 Rue de Montagny, Lyon" },
      ],
    },
    {
      id: 8, enonce: "Où se trouve le Consulat du Pérou ?",
      choix: [
        { lettre: "A", texte: "3 Rue Mercière, Lyon" },
        { lettre: "B", texte: "33 Place George Sand, Lyon" },
        { lettre: "C", texte: "3 Place de la Bourse, Lyon", correct: true },
        { lettre: "D", texte: "56 Rue de la République, Lyon" },
      ],
    },
    {
      id: 9, enonce: "Où se trouve le Consulat de Roumanie ?",
      choix: [
        { lettre: "A", texte: "9 Rue de Margnolles, Lyon" },
        { lettre: "B", texte: "29 Rue de Bonnel, Lyon", correct: true },
        { lettre: "C", texte: "10 Rue de Gerland, Lyon" },
        { lettre: "D", texte: "55 Rue de la Part-Dieu, Lyon" },
      ],
    },
    {
      id: 10, enonce: "Où se trouve le Consulat de Finlande ?",
      choix: [
        { lettre: "A", texte: "9 Rue de Margnolles, Lyon" },
        { lettre: "B", texte: "29 Rue de Bonnel, Lyon" },
        { lettre: "C", texte: "3 Rue de la Barre, Lyon", correct: true },
        { lettre: "D", texte: "88 Rue Dedieu, Lyon" },
      ],
    },
    {
      id: 11, enonce: "Où se trouve le Consulat du Portugal ?",
      choix: [
        { lettre: "A", texte: "88 Rue Colin, Lyon" },
        { lettre: "B", texte: "71 Rue Crillon, Lyon", correct: true },
        { lettre: "C", texte: "145 Rue Camille Koechlin, Lyon" },
        { lettre: "D", texte: "99 Rue Jean Cam, Lyon" },
      ],
    },
    {
      id: 12, enonce: "Où se trouve le Consulat d'Allemagne ?",
      choix: [
        { lettre: "A", texte: "33 Boulevard des Belges, Lyon", correct: true },
        { lettre: "B", texte: "58 Rue Fabian Martin, Lyon" },
        { lettre: "C", texte: "68 Rue Baraban, Lyon" },
        { lettre: "D", texte: "36 Rue Paul Bert, Lyon" },
      ],
    },
    {
      id: 13, enonce: "Où se trouve le Consulat d'Algérie ?",
      choix: [
        { lettre: "A", texte: "98 Rue Saint-Vincent de Paul, Lyon" },
        { lettre: "B", texte: "35 Rue Verlet-Hanus, Lyon" },
        { lettre: "C", texte: "58 Rue Ottavi, Lyon" },
        { lettre: "D", texte: "126 Rue Vauban, Lyon", correct: true },
      ],
    },
    {
      id: 14, enonce: "Où se trouve le Consulat de Chine ?",
      choix: [
        { lettre: "A", texte: "99 Rue Paul Lafargue, Lyon" },
        { lettre: "B", texte: "15 Rue René, Lyon" },
        { lettre: "C", texte: "69 Rue Duquesne, Lyon", correct: true },
        { lettre: "D", texte: "87 Rue Raspail, Lyon" },
      ],
    },
    {
      id: 15, enonce: "Où se trouve le Consulat de Côte d'Ivoire ?",
      choix: [
        { lettre: "A", texte: "72 Rue Ozanam, Lyon" },
        { lettre: "B", texte: "56 Avenue Maréchal Foch, Lyon", correct: true },
        { lettre: "C", texte: "16 Rue Zola, Lyon" },
        { lettre: "D", texte: "74 Rue du Commerce, Lyon" },
      ],
    },
    {
      id: 16, enonce: "Où se trouve le Consulat de Madagascar ?",
      choix: [
        { lettre: "A", texte: "35 Rue Turbil, Lyon" },
        { lettre: "B", texte: "3 Rue Amédée Bonnet, Lyon", correct: true },
        { lettre: "C", texte: "45 Rue Poizat, Lyon" },
        { lettre: "D", texte: "65 Rue Yvonne Chanu, Lyon" },
      ],
    },
    {
      id: 17, enonce: "Où se trouve le Consulat de Malte ?",
      choix: [
        { lettre: "A", texte: "77 Rue Rabelais, Lyon" },
        { lettre: "B", texte: "95 Rue Philippe Fabia, Lyon" },
        { lettre: "C", texte: "56 Rue Pascal, Lyon" },
        { lettre: "D", texte: "15 Place Jules Ferry, Lyon", correct: true },
      ],
    },
    {
      id: 18, enonce: "Où se trouvait le Consulat de Russie (aujourd'hui fermé) ?",
      choix: [
        { lettre: "A", texte: "55 Rue du Sergent Michel Berthet, 69009 Lyon", correct: true },
        { lettre: "B", texte: "2 Place de la Bourse, Lyon" },
        { lettre: "C", texte: "Rue du Lac, Lyon" },
        { lettre: "D", texte: "87 Place George Sand, Lyon" },
      ],
    },
    {
      id: 19, enonce: "Où se trouve le Consulat du Danemark ?",
      choix: [
        { lettre: "A", texte: "136 Cours Lafayette, Lyon", correct: true },
        { lettre: "B", texte: "99 Rue du Commerce, Lyon" },
        { lettre: "C", texte: "57 Rue des Rancy, Lyon" },
        { lettre: "D", texte: "23 Rue de la République, Lyon" },
      ],
    },
    {
      id: 20, enonce: "Où se trouve le Consulat de Suède ?",
      choix: [
        { lettre: "A", texte: "33 Rue Amédée Bonnet, Lyon" },
        { lettre: "B", texte: "66 Rue Crillon, Lyon", correct: true },
        { lettre: "C", texte: "77 Place Bellecour, Lyon" },
        { lettre: "D", texte: "32 Rue Trillon, Lyon" },
      ],
    },
  ],
};

// =============================================
// QUIZ 3 — HÔPITAUX ET CLINIQUES
// =============================================
export const QUIZ_HOPITAUX: ExerciceItem = {
  id: 7003, actif: true,
  titre: "Quiz Adresses Hôpitaux et Cliniques",
  sousTitre: "20 questions sur les hôpitaux et cliniques de Lyon",
  questions: [
    {
      id: 1, enonce: "Où se trouve la Clinique Saint-Charles ?",
      choix: [
        { lettre: "A", texte: "25 Rue de Flesselles, Lyon", correct: true },
        { lettre: "B", texte: "2 Place Sathonay, Lyon" },
        { lettre: "C", texte: "97 Rue des Marronniers, Lyon" },
        { lettre: "D", texte: "33 Rue des Marronniers, Lyon" },
      ],
    },
    {
      id: 2, enonce: "Où se trouve l'Hôpital d'instruction des armées Desgenettes ?",
      choix: [
        { lettre: "A", texte: "108 Boulevard Pinel, Bron", correct: true },
        { lettre: "B", texte: "108 Boulevard Pinel, Lyon" },
        { lettre: "C", texte: "109 Rue Paul Bert, Lyon" },
        { lettre: "D", texte: "33 Rue des Marronniers, Lyon" },
      ],
    },
    {
      id: 3, enonce: "Où se trouve l'Hôpital Édouard Herriot ?",
      choix: [
        { lettre: "A", texte: "5 Place d'Arsonval, Lyon", correct: true },
        { lettre: "B", texte: "158 Rue Pierre Corneille, Lyon" },
        { lettre: "C", texte: "32 Rue Richelieu, Lyon" },
        { lettre: "D", texte: "5 Avenue Jean Mermoz, Lyon" },
      ],
    },
    {
      id: 4, enonce: "Où se trouve la Clinique Émilie de Vialar ?",
      choix: [
        { lettre: "A", texte: "116 Rue Antoine Charial, Lyon", correct: true },
        { lettre: "B", texte: "305 Rue Paul Bert, Lyon" },
        { lettre: "C", texte: "99 Avenue Roger Salengro, Lyon" },
        { lettre: "D", texte: "2 Place Sathonay, Lyon" },
      ],
    },
    {
      id: 5, enonce: "Où se trouve l'Hôpital de la Croix-Rousse ?",
      choix: [
        { lettre: "A", texte: "103 Grande Rue de la Croix-Rousse, Lyon", correct: true },
        { lettre: "B", texte: "98 Boulevard de la Croix-Rousse, Lyon" },
        { lettre: "C", texte: "69 Rue du Commerce, Lyon" },
        { lettre: "D", texte: "30 Rue des Producteurs, Lyon" },
      ],
    },
    {
      id: 6, enonce: "Où se trouve l'Hôpital Jean Mermoz ?",
      choix: [
        { lettre: "A", texte: "55 Avenue Jean Mermoz, Lyon", correct: true },
        { lettre: "B", texte: "98 Rue de Flesselles, Lyon" },
        { lettre: "C", texte: "69 Boulevard Pinel, Bron" },
        { lettre: "D", texte: "8 Rue des Producteurs, Lyon" },
      ],
    },
    {
      id: 7, enonce: "Où se trouve le Centre Médico-Chirurgical des Massues ?",
      choix: [
        { lettre: "A", texte: "92 Rue Dr Edmond Locard, Lyon", correct: true },
        { lettre: "B", texte: "98 Rue de Flesselles, Lyon" },
        { lettre: "C", texte: "55 Rue Jacqueline Auriol, Lyon" },
        { lettre: "D", texte: "69 Rue du Commerce, Lyon" },
      ],
    },
    {
      id: 8, enonce: "Où se trouve la Clinique de l'Infirmerie Protestante ?",
      choix: [
        { lettre: "A", texte: "3 Chemin du Penthod, Caluire-et-Cuire", correct: true },
        { lettre: "B", texte: "25 Avenue Jean Mermoz, Lyon" },
        { lettre: "C", texte: "69 Rue Saint-Mathieu, Meyzieu" },
        { lettre: "D", texte: "92 Rue Dr Edmond Locard, Lyon" },
      ],
    },
    {
      id: 9, enonce: "Où se trouve la Clinique de la Sauvegarde ?",
      choix: [
        { lettre: "A", texte: "480 Avenue Ben Gourion, Lyon", correct: true },
        { lettre: "B", texte: "10 Avenue du Docteur Goujon, Villeurbanne" },
        { lettre: "C", texte: "69 Rue Saint-Mathieu, Meyzieu" },
        { lettre: "D", texte: "20 Rue d'Écully, Lyon" },
      ],
    },
    {
      id: 10, enonce: "Où se trouve la Clinique du Val d'Ouest ?",
      choix: [
        { lettre: "A", texte: "39 Chemin de la Vernique, Écully", correct: true },
        { lettre: "B", texte: "480 Avenue Ben Gourion, Lyon" },
        { lettre: "C", texte: "39 Chemin de la Sauvegarde, Écully" },
        { lettre: "D", texte: "20 Rue d'Écully, Lyon" },
      ],
    },
    {
      id: 11, enonce: "Où se trouve l'Hôpital Femme-Mère-Enfant ?",
      choix: [
        { lettre: "A", texte: "59 Boulevard Pinel, Bron", correct: true },
        { lettre: "B", texte: "20 Avenue Jean Mermoz, Bron" },
        { lettre: "C", texte: "5 Place d'Arsonval, Lyon" },
        { lettre: "D", texte: "20 Rue d'Écully, Lyon" },
      ],
    },
    {
      id: 12, enonce: "Où se trouve l'Hôpital Pierre Wertheimer ?",
      choix: [
        { lettre: "A", texte: "59 Boulevard Pinel, Bron", correct: true },
        { lettre: "B", texte: "57 Boulevard Pinel, Bron" },
        { lettre: "C", texte: "5 Place d'Arsonval, Lyon" },
        { lettre: "D", texte: "20 Rue d'Écully, Lyon" },
      ],
    },
    {
      id: 13, enonce: "Où se trouve l'Hôpital Cardiovasculaire Louis-Pradel ?",
      choix: [
        { lettre: "A", texte: "59 Boulevard Pinel, Bron" },
        { lettre: "B", texte: "28 Avenue du Doyen Lépine, Bron", correct: true },
        { lettre: "C", texte: "58 Boulevard Pinel, Bron" },
        { lettre: "D", texte: "20 Avenue Jean Mermoz, Bron" },
      ],
    },
    {
      id: 14, enonce: "Où se trouve le Centre Hospitalier Lyon Sud ?",
      choix: [
        { lettre: "A", texte: "165 Chemin du Grand Revoyet, Pierre-Bénite", correct: true },
        { lettre: "B", texte: "20 Avenue Jean Mermoz, Bron" },
        { lettre: "C", texte: "5 Place Jean-Jaurès, Pierre-Bénite" },
        { lettre: "D", texte: "58 Boulevard Pinel, Bron" },
      ],
    },
    {
      id: 15, enonce: "Où se trouve le GHM Les Portes du Sud ?",
      choix: [
        { lettre: "A", texte: "2 Avenue du 11 Novembre 1918, Vénissieux", correct: true },
        { lettre: "B", texte: "54 Rue Paul Bert, Vénissieux" },
        { lettre: "C", texte: "2 Avenue du 11 Novembre 1918, Saint-Priest" },
        { lettre: "D", texte: "165 Boulevard Pinel, Bron" },
      ],
    },
    {
      id: 16, enonce: "Où se trouve la Clinique Natecia ?",
      choix: [
        { lettre: "A", texte: "22 Avenue Rockefeller, Lyon", correct: true },
        { lettre: "B", texte: "22 Avenue Rockefeller, Bron" },
        { lettre: "C", texte: "23 Boulevard Pinel, Lyon" },
        { lettre: "D", texte: "2 Avenue Laennec, Lyon" },
      ],
    },
    {
      id: 17, enonce: "Où se trouve la Clinique Charcot ?",
      choix: [
        { lettre: "A", texte: "51-53 Rue Commandant Charcot, Sainte-Foy-lès-Lyon", correct: true },
        { lettre: "B", texte: "51-53 Rue Commandant Charcot, Lyon" },
        { lettre: "C", texte: "51-53 Rue Commandant Charcot, Francheville" },
        { lettre: "D", texte: "51-53 Rue Commandant Charcot, Tassin-la-Demi-Lune" },
      ],
    },
    {
      id: 18, enonce: "Où se trouve le Centre Hospitalier Le Vinatier ?",
      choix: [
        { lettre: "A", texte: "95 Boulevard Pinel, Bron", correct: true },
        { lettre: "B", texte: "95 Boulevard Pinel, Lyon" },
        { lettre: "C", texte: "95 Avenue Jean Mermoz, Bron" },
        { lettre: "D", texte: "95 Avenue Jean Mermoz, Lyon" },
      ],
    },
    {
      id: 19, enonce: "Où se trouve le Centre Hospitalier Saint-Jean-de-Dieu ?",
      choix: [
        { lettre: "A", texte: "290 Route de Vienne, Lyon", correct: true },
        { lettre: "B", texte: "290 Route de Vienne, Saint-Fons" },
        { lettre: "C", texte: "290 Route de Gerland, Lyon" },
        { lettre: "D", texte: "290 Avenue Leclerc, Lyon" },
      ],
    },
    {
      id: 20, enonce: "Où se trouve le Médipôle ?",
      choix: [
        { lettre: "A", texte: "158 Rue Léon Blum, Villeurbanne", correct: true },
        { lettre: "B", texte: "152 Rue Léon Blum, Villeurbanne" },
        { lettre: "C", texte: "158 Rue Léon Blum, Lyon" },
        { lettre: "D", texte: "158 Rue Léon Blum, Bron" },
      ],
    },
  ],
};

// =============================================
// QUIZ 4 — MUSÉES
// =============================================
export const QUIZ_MUSEES: ExerciceItem = {
  id: 7004, actif: true,
  titre: "Quiz Adresses Musées",
  sousTitre: "11 questions sur les musées de Lyon",
  questions: [
    {
      id: 1, enonce: "Où se trouve le Musée Lugdunum ?",
      choix: [
        { lettre: "A", texte: "17 Rue Cléberg, Lyon", correct: true },
        { lettre: "B", texte: "86 Quai Perrache, Lyon" },
        { lettre: "C", texte: "1 Place du Petit Collège, Lyon" },
        { lettre: "D", texte: "17 Rue Tête d'Or, Lyon" },
      ],
    },
    {
      id: 2, enonce: "Où se trouve le Musée Historique de Lyon / Musée Gadagne ?",
      choix: [
        { lettre: "A", texte: "1 Place du Petit Collège, Lyon", correct: true },
        { lettre: "B", texte: "17 Rue Cléberg, Lyon" },
        { lettre: "C", texte: "81 Quai Charles de Gaulle, Lyon" },
        { lettre: "D", texte: "10 Rue d'Ivry, Lyon" },
      ],
    },
    {
      id: 3, enonce: "Où se trouve la Maison des Canuts / Musée des Tissages ?",
      choix: [
        { lettre: "A", texte: "10 Rue d'Ivry, Lyon", correct: true },
        { lettre: "B", texte: "20 Place des Terreaux, Lyon" },
        { lettre: "C", texte: "86 Quai Perrache, Lyon" },
        { lettre: "D", texte: "20 Rue de Gerland, Lyon" },
      ],
    },
    {
      id: 4, enonce: "Où se trouve le Musée des Confluences ?",
      choix: [
        { lettre: "A", texte: "86 Quai Perrache, Lyon", correct: true },
        { lettre: "B", texte: "17 Rue Cléberg, Lyon" },
        { lettre: "C", texte: "20 Rue de Gerland, Lyon" },
        { lettre: "D", texte: "10 Rue d'Ivry, Lyon" },
      ],
    },
    {
      id: 5, enonce: "Où se trouve le Musée d'Art Contemporain ?",
      choix: [
        { lettre: "A", texte: "81 Quai Charles de Gaulle, Lyon", correct: true },
        { lettre: "B", texte: "17 Rue Cléberg, Lyon" },
        { lettre: "C", texte: "86 Quai Perrache, Lyon" },
        { lettre: "D", texte: "2 Avenue Tête d'Or, Lyon" },
      ],
    },
    {
      id: 6, enonce: "Où se trouve le Musée des Beaux-Arts ?",
      choix: [
        { lettre: "A", texte: "20 Place des Terreaux, Lyon", correct: true },
        { lettre: "B", texte: "81 Quai Charles de Gaulle, Lyon" },
        { lettre: "C", texte: "3 Rue de Brest, Lyon" },
        { lettre: "D", texte: "24 Place Bellecour, Lyon" },
      ],
    },
    {
      id: 7, enonce: "Où se trouve le Musée de l'Imprimerie et de la Banque ?",
      choix: [
        { lettre: "A", texte: "13 Rue de la Poulaillerie, Lyon", correct: true },
        { lettre: "B", texte: "17 Rue Cléberg, Lyon" },
        { lettre: "C", texte: "20 Rue de la Charité, Lyon" },
        { lettre: "D", texte: "2 Quai du Docteur Gailleton, Lyon" },
      ],
    },
    {
      id: 8, enonce: "Où se trouve le Musée de la Résistance et de la Déportation ?",
      choix: [
        { lettre: "A", texte: "14 Avenue Berthelot, Lyon", correct: true },
        { lettre: "B", texte: "20 Place Bellecour, Lyon" },
        { lettre: "C", texte: "10 Route de Vienne, Lyon" },
        { lettre: "D", texte: "53 Avenue Jean Jaurès, Lyon" },
      ],
    },
    {
      id: 9, enonce: "Où se trouve le Musée Urbain Tony Garnier ?",
      choix: [
        { lettre: "A", texte: "4 Rue des Serpollières, Lyon", correct: true },
        { lettre: "B", texte: "20 Rue de Gerland, Lyon" },
        { lettre: "C", texte: "17 Rue Division Leclerc, Lyon" },
        { lettre: "D", texte: "20 Avenue des États-Unis, Lyon" },
      ],
    },
    {
      id: 10, enonce: "Où se trouve l'Institut Lumière ?",
      choix: [
        { lettre: "A", texte: "25 Rue du Premier Film, Lyon", correct: true },
        { lettre: "B", texte: "81 Quai Charles de Gaulle, Lyon" },
        { lettre: "C", texte: "30 Rue du 2ème Film, Lyon" },
        { lettre: "D", texte: "2 Avenue Tête d'Or, Lyon" },
      ],
    },
    {
      id: 11, enonce: "Où se trouve le Musée des Sapeurs Pompiers ?",
      choix: [
        { lettre: "A", texte: "358 Avenue de Champagne, Lyon", correct: true },
        { lettre: "B", texte: "17 Rue Cléberg, Lyon" },
        { lettre: "C", texte: "28 Rue de Gerland, Lyon" },
        { lettre: "D", texte: "3 Rue de Brest, Lyon" },
      ],
    },
  ],
};

// =============================================
// QUIZ 5 — DIVERS
// =============================================
export const QUIZ_DIVERS: ExerciceItem = {
  id: 7005, actif: true,
  titre: "Quiz Adresses Divers",
  sousTitre: "15 questions sur des adresses diverses de Lyon",
  questions: [
    {
      id: 1, enonce: "Où se trouve la Direction Départementale des Anciens Combattants ?",
      choix: [
        { lettre: "A", texte: "3 Rue Louis Vitet, Lyon", correct: true },
        { lettre: "B", texte: "15 Rue du Commerce, Lyon" },
        { lettre: "C", texte: "2 Rue Magenta, Lyon" },
        { lettre: "D", texte: "28 Rue Mercière, Lyon" },
      ],
    },
    {
      id: 2, enonce: "Où se trouve la Direction Régionale des Affaires Culturelles ?",
      choix: [
        { lettre: "A", texte: "6 Quai Saint-Vincent, Lyon", correct: true },
        { lettre: "B", texte: "55 Rue des Joueurs, Lyon" },
        { lettre: "C", texte: "74 Rue Mercière, Lyon" },
        { lettre: "D", texte: "88 Rue Paul Bert, Lyon" },
      ],
    },
    {
      id: 3, enonce: "Où se trouve La Cour des Voraces ?",
      choix: [
        { lettre: "A", texte: "9 Place Colbert, Lyon", correct: true },
        { lettre: "B", texte: "36 Rue Étienne Richerand, Lyon" },
        { lettre: "C", texte: "99 Rue Haute Productions, Lyon" },
        { lettre: "D", texte: "Rue Haute Productions, Lyon" },
      ],
    },
    {
      id: 4, enonce: "Où se trouve la Banque de France ?",
      choix: [
        { lettre: "A", texte: "4bis Cours Bayard, Lyon", correct: true },
        { lettre: "B", texte: "63 Rue Kessler, Lyon" },
        { lettre: "C", texte: "33 Rue Terrasse, Lyon" },
        { lettre: "D", texte: "144 Rue Léon Jouhaux, Lyon" },
      ],
    },
    {
      id: 5, enonce: "Où se trouve le Groupement de Gendarmerie du Rhône ?",
      choix: [
        { lettre: "A", texte: "2 Rue Bichat, Lyon", correct: true },
        { lettre: "B", texte: "84 Rue Lanterne, Lyon" },
        { lettre: "C", texte: "36 Rue Desaix, Lyon" },
        { lettre: "D", texte: "102 Rue Yzeux, Lyon" },
      ],
    },
    {
      id: 6, enonce: "Où se trouve le Théâtre des Célestins ?",
      choix: [
        { lettre: "A", texte: "Place des Célestins, Lyon", correct: true },
        { lettre: "B", texte: "48 Place des Célestins, Lyon" },
        { lettre: "C", texte: "12 Place Voltaire, Lyon" },
        { lettre: "D", texte: "63 Place du Pont, Lyon" },
      ],
    },
    {
      id: 7, enonce: "Où se trouve le Cimetière de la Croix-Rousse ?",
      choix: [
        { lettre: "A", texte: "63 Rue Philippe de Lassalle, Lyon", correct: true },
        { lettre: "B", texte: "21 Rue Urbain Vitry, Lyon" },
        { lettre: "C", texte: "72 Rue Romarin, Lyon" },
        { lettre: "D", texte: "37 Rue Sala, Lyon" },
      ],
    },
    {
      id: 8, enonce: "Où se trouve le Cimetière de Loyasse ?",
      choix: [
        { lettre: "A", texte: "43 Rue du Cardinal Gerlier, Lyon", correct: true },
        { lettre: "B", texte: "76 Rue Capitaine Robert Cluzan, Lyon" },
        { lettre: "C", texte: "96 Rue Quincampoix, Lyon" },
        { lettre: "D", texte: "61 Rue Mazenod, Lyon" },
      ],
    },
    {
      id: 9, enonce: "Où se trouve le Musée Gallo-Romain ?",
      choix: [
        { lettre: "A", texte: "17 Rue Cléberg, Lyon", correct: true },
        { lettre: "B", texte: "76 Rue Capitaine Robert Cluzan, Lyon" },
        { lettre: "C", texte: "61 Rue Mazenod, Lyon" },
        { lettre: "D", texte: "28 Rue de Gerland, Lyon" },
      ],
    },
    {
      id: 10, enonce: "Où se trouve la Direction Régionale de Pôle Emploi ?",
      choix: [
        { lettre: "A", texte: "13 Rue Crépet, Lyon", correct: true },
        { lettre: "B", texte: "65 Rue Mazenod, Lyon" },
        { lettre: "C", texte: "2 Place George Sand, Lyon" },
        { lettre: "D", texte: "16 Rue de la République, Lyon" },
      ],
    },
    {
      id: 11, enonce: "Où se trouve l'ENS de Lyon – Site Monod ?",
      choix: [
        { lettre: "A", texte: "46 Allées d'Italie, Lyon", correct: true },
        { lettre: "B", texte: "8 Rue Mazenod, Lyon" },
        { lettre: "C", texte: "69 Rue Thomassin, Lyon" },
        { lettre: "D", texte: "102 Rue Royale, Lyon" },
      ],
    },
    {
      id: 12, enonce: "Où se trouve l'ENS de Lyon – Site Descartes ?",
      choix: [
        { lettre: "A", texte: "15 Parvis René Descartes, Lyon", correct: true },
        { lettre: "B", texte: "64 Rue Yves Farge, Lyon" },
        { lettre: "C", texte: "37 Rue Maurice Flandin, Lyon" },
        { lettre: "D", texte: "1 Rue Juiverie, Lyon" },
      ],
    },
    {
      id: 13, enonce: "Où se trouve la Fourrière Municipale ?",
      choix: [
        { lettre: "A", texte: "38 Rue Pierre Sémard, Lyon", correct: true },
        { lettre: "B", texte: "18 Rue de Bonnel, Lyon" },
        { lettre: "C", texte: "58 Rue Flandin, Lyon" },
        { lettre: "D", texte: "145 Rue Yvonne Chanu, Lyon" },
      ],
    },
    {
      id: 14, enonce: "Où se trouve l'Institut Lumière ?",
      choix: [
        { lettre: "A", texte: "25 Rue du Premier Film, Lyon", correct: true },
        { lettre: "B", texte: "88 Rue du Premier Mai, Lyon" },
        { lettre: "C", texte: "49 Rue du Presbytère, Lyon" },
        { lettre: "D", texte: "47 Rue du Presbytère, Lyon" },
      ],
    },
    {
      id: 15, enonce: "Où se trouve le Tribunal Judiciaire de Villeurbanne ?",
      choix: [
        { lettre: "A", texte: "3 Rue Dr P. Fleury Papillon, Lyon" },
        { lettre: "B", texte: "20 Rue Magenta, Lyon", correct: true },
        { lettre: "C", texte: "96 Rue de la République, Lyon" },
        { lettre: "D", texte: "85 Place George Sand, Lyon" },
      ],
    },
  ],
};

// =============================================
// QUIZ 6 — PONTS
// =============================================
export const QUIZ_PONTS: ExerciceItem = {
  id: 7006, actif: true,
  titre: "Quiz Ponts de Lyon",
  sousTitre: "10 questions sur les ponts du Rhône et de la Saône",
  questions: [
    {
      id: 1, enonce: "Lequel de ces ponts est un pont sur le Rhône ?",
      choix: [
        { lettre: "A", texte: "Pont Morand", correct: true },
        { lettre: "B", texte: "Pont Bonaparte" },
        { lettre: "C", texte: "Pont la Feuillée" },
        { lettre: "D", texte: "Passerelle du Palais-de-Justice" },
      ],
    },
    {
      id: 2, enonce: "Lequel de ces ponts est un pont sur la Saône ?",
      choix: [
        { lettre: "A", texte: "Pont Lafayette" },
        { lettre: "B", texte: "Pont Wilson" },
        { lettre: "C", texte: "Pont Bonaparte", correct: true },
        { lettre: "D", texte: "Pont de la Guillotière" },
      ],
    },
    {
      id: 3, enonce: "Le Pont Raymond Barre traverse quel cours d'eau ?",
      choix: [
        { lettre: "A", texte: "Le Rhône", correct: true },
        { lettre: "B", texte: "La Saône" },
        { lettre: "C", texte: "Le Beaujolais" },
        { lettre: "D", texte: "La Loire" },
      ],
    },
    {
      id: 4, enonce: "Lequel de ces ponts est sur le Rhône ?",
      choix: [
        { lettre: "A", texte: "Pont la Feuillée" },
        { lettre: "B", texte: "Pont de la Guillotière", correct: true },
        { lettre: "C", texte: "Passerelle du Palais-de-Justice" },
        { lettre: "D", texte: "Pont Bonaparte" },
      ],
    },
    {
      id: 5, enonce: "Le Pont Winston Churchill est un pont sur :",
      choix: [
        { lettre: "A", texte: "Le Rhône", correct: true },
        { lettre: "B", texte: "La Saône" },
        { lettre: "C", texte: "Le canal de Jonage" },
        { lettre: "D", texte: "La Deûle" },
      ],
    },
    {
      id: 6, enonce: "Le Pont Clemenceau traverse :",
      choix: [
        { lettre: "A", texte: "La Saône" },
        { lettre: "B", texte: "Le Rhône", correct: true },
        { lettre: "C", texte: "Le ruisseau d'Yzeron" },
        { lettre: "D", texte: "La Loire" },
      ],
    },
    {
      id: 7, enonce: "Lequel de ces ponts est sur la Saône ?",
      choix: [
        { lettre: "A", texte: "Pont Gallieni" },
        { lettre: "B", texte: "Pont Robert Schuman" },
        { lettre: "C", texte: "Pont la Feuillée", correct: true },
        { lettre: "D", texte: "Pont de Lattre-de-Tassigny" },
      ],
    },
    {
      id: 8, enonce: "Le Pont Pasteur est un pont sur :",
      choix: [
        { lettre: "A", texte: "Le Rhône", correct: true },
        { lettre: "B", texte: "La Saône" },
        { lettre: "C", texte: "Le Beaujolais" },
        { lettre: "D", texte: "L'Azergues" },
      ],
    },
    {
      id: 9, enonce: "La Passerelle du Palais-de-Justice traverse :",
      choix: [
        { lettre: "A", texte: "Le Rhône" },
        { lettre: "B", texte: "La Saône", correct: true },
        { lettre: "C", texte: "Le canal de Jonage" },
        { lettre: "D", texte: "La Deûle" },
      ],
    },
    {
      id: 10, enonce: "Combien de ponts traversent le Rhône à Lyon (environ) ?",
      choix: [
        { lettre: "A", texte: "7" },
        { lettre: "B", texte: "10" },
        { lettre: "C", texte: "13", correct: true },
        { lettre: "D", texte: "20" },
      ],
    },
  ],
};

// =============================================
// QUIZ 7 — STATUES
// =============================================
export const QUIZ_STATUES: ExerciceItem = {
  id: 7007, actif: true,
  titre: "Quiz Statues de Lyon",
  sousTitre: "2 questions sur les statues de Lyon",
  questions: [
    {
      id: 1, enonce: "Quelle personnalité représente la statue se trouvant sur la Place Bellecour ?",
      choix: [
        { lettre: "A", texte: "Charlemagne" },
        { lettre: "B", texte: "Louis XIV", correct: true },
        { lettre: "C", texte: "Bonaparte" },
        { lettre: "D", texte: "Louis XVI" },
      ],
    },
    {
      id: 2, enonce: "Comment se nomme la statue sur la Place des Terreaux ?",
      choix: [
        { lettre: "A", texte: "Liberté du Pont de Grenelle" },
        { lettre: "B", texte: "Le Chant des Canuts" },
        { lettre: "C", texte: "Fontaine Bartholdi", correct: true },
        { lettre: "D", texte: "Michel Debré" },
      ],
    },
  ],
};

// =============================================
// QUIZ 8 — STATIONS DE TAXIS
// =============================================
export const QUIZ_STATIONS_TAXIS: ExerciceItem = {
  id: 7008, actif: true,
  titre: "Quiz Stations de Taxis",
  sousTitre: "10 questions sur les stations de taxis de Lyon",
  questions: [
    {
      id: 1, enonce: "Quelle est la station de taxi du 1er arrondissement de Lyon ?",
      choix: [
        { lettre: "A", texte: "36 Rue Sœur Janin, Lyon" },
        { lettre: "B", texte: "1 Rue du Président Édouard Herriot, Lyon", correct: true },
        { lettre: "C", texte: "22 Quai Romain Rolland, Lyon" },
        { lettre: "D", texte: "37 Cours Vitton, Lyon" },
      ],
    },
    {
      id: 2, enonce: "Laquelle de ces adresses est une station de taxi du 2ème arrondissement ?",
      choix: [
        { lettre: "A", texte: "26 Place Bellecour, Lyon", correct: true },
        { lettre: "B", texte: "37 Cours Vitton, Lyon" },
        { lettre: "C", texte: "105 Cours Albert Thomas, Lyon" },
        { lettre: "D", texte: "Boulevard de la Croix-Rousse, Lyon" },
      ],
    },
    {
      id: 3, enonce: "Laquelle de ces adresses est une station de taxi du 2ème arrondissement ?",
      choix: [
        { lettre: "A", texte: "Boulevard Vivier Merle, Lyon" },
        { lettre: "B", texte: "1 Place Carnot, Lyon", correct: true },
        { lettre: "C", texte: "Place d'Arsonval, Lyon" },
        { lettre: "D", texte: "Rue Philibert Roussy, Lyon" },
      ],
    },
    {
      id: 4, enonce: "Laquelle de ces adresses est une station de taxi du 3ème arrondissement ?",
      choix: [
        { lettre: "A", texte: "Place d'Arsonval, Lyon", correct: true },
        { lettre: "B", texte: "26 Place Bellecour, Lyon" },
        { lettre: "C", texte: "Place du Général Leclerc, Lyon" },
        { lettre: "D", texte: "36 Rue Sœur Janin, Lyon" },
      ],
    },
    {
      id: 5, enonce: "Laquelle de ces adresses est une station de taxi du 3ème arrondissement ?",
      choix: [
        { lettre: "A", texte: "1 Place des Cordeliers, Lyon" },
        { lettre: "B", texte: "Boulevard Vivier Merle, Lyon", correct: true },
        { lettre: "C", texte: "37 Cours Vitton, Lyon" },
        { lettre: "D", texte: "Place du Maréchal Lyautey, Lyon" },
      ],
    },
    {
      id: 6, enonce: "Laquelle de ces adresses est une station de taxi du 4ème arrondissement ?",
      choix: [
        { lettre: "A", texte: "Boulevard de la Croix-Rousse, Lyon", correct: true },
        { lettre: "B", texte: "Place d'Arsonval, Lyon" },
        { lettre: "C", texte: "37 Cours Vitton, Lyon" },
        { lettre: "D", texte: "1 Place Carnot, Lyon" },
      ],
    },
    {
      id: 7, enonce: "Laquelle de ces adresses est une station de taxi du 5ème arrondissement ?",
      choix: [
        { lettre: "A", texte: "37 Cours Vitton, Lyon" },
        { lettre: "B", texte: "Place Saint-Paul, Lyon", correct: true },
        { lettre: "C", texte: "Boulevard Vivier Merle, Lyon" },
        { lettre: "D", texte: "26 Place Bellecour, Lyon" },
      ],
    },
    {
      id: 8, enonce: "Laquelle de ces adresses est une station de taxi du 6ème arrondissement ?",
      choix: [
        { lettre: "A", texte: "Place d'Arsonval, Lyon" },
        { lettre: "B", texte: "Place du Maréchal Lyautey, Lyon", correct: true },
        { lettre: "C", texte: "1 Place Carnot, Lyon" },
        { lettre: "D", texte: "Boulevard de la Croix-Rousse, Lyon" },
      ],
    },
    {
      id: 9, enonce: "Laquelle de ces adresses est une station de taxi du 6ème arrondissement ?",
      choix: [
        { lettre: "A", texte: "Place du Général Leclerc, Lyon", correct: true },
        { lettre: "B", texte: "Place Saint-Paul, Lyon" },
        { lettre: "C", texte: "Place de Trion, Lyon" },
        { lettre: "D", texte: "1 Place des Cordeliers, Lyon" },
      ],
    },
    {
      id: 10, enonce: "Laquelle de ces adresses est une station de taxi du 8ème arrondissement ?",
      choix: [
        { lettre: "A", texte: "37 Cours Vitton, Lyon" },
        { lettre: "B", texte: "Place du 11 Novembre 1918, Lyon", correct: true },
        { lettre: "C", texte: "Boulevard de la Croix-Rousse, Lyon" },
        { lettre: "D", texte: "Place d'Arsonval, Lyon" },
      ],
    },
  ],
};

// =============================================
// Liste complète des quiz pour le module Connaissance de la ville
// =============================================
export const CONNAISSANCES_VILLE_QUIZZES: ExerciceItem[] = [
  QUIZ_ADMINISTRATIONS,
  QUIZ_CONSULATS,
  QUIZ_HOPITAUX,
  QUIZ_MUSEES,
  QUIZ_DIVERS,
  QUIZ_PONTS,
  QUIZ_STATUES,
  QUIZ_STATIONS_TAXIS,
];
