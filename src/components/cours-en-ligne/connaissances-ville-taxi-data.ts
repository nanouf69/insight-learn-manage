// ===== Données du module "7. CONNAISSANCES DE LA VILLE TAXI" =====
import { CONNAISSANCES_VILLE_QUIZZES } from "./exercices/connaissances-ville-quiz-data";
import { QUIZ_AUTOROUTES } from "./exercices/adresses-autoroutes-quiz-data";
import { QUIZ_AVENUES } from "./exercices/adresses-avenues-quiz-data";
import { QUIZ_BOULEVARDS } from "./exercices/adresses-boulevards-quiz-data";
import { QUIZ_COURS } from "./exercices/adresses-cours-quiz-data";
import { QUIZ_PLACES } from "./exercices/adresses-places-quiz-data";
import { QUIZ_QUAIS } from "./exercices/adresses-quais-quiz-data";
import { QUIZ_RUES } from "./exercices/adresses-rues-quiz-data";

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  description?: string;
  image?: string;
  actif: boolean;
  fichiers?: { nom: string; url: string }[];
}

interface ExerciceItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
  questions?: { id: number; enonce: string; choix: { lettre: string; texte: string; correct?: boolean }[] }[];
  fichiers?: { nom: string; url: string }[];
}

interface ModuleData {
  id: number;
  nom: string;
  description: string;
  cours: ContentItem[];
  exercices: ExerciceItem[];
}

export const CONNAISSANCES_VILLE_TAXI_DATA: ModuleData = {
  id: 7,
  nom: "7.CONNAISSANCES DE LA VILLE TAXI",
  description: "Connaissances géographiques et culturelles de Lyon et sa région : châteaux, gares, hôpitaux, mairies, églises, fresques, consulats, commissariats, hôtels et lieux divers.",
  cours: [
    {
      id: 1, actif: true,
      titre: "Les Châteaux",
      sousTitre: "Château de la Motte, Fort Saint Jean, Domaine de la Bachasse, Château Lacroix Laval...",
      description: "Découvrez les châteaux et forts historiques de Lyon et sa région.",
      fichiers: [{ nom: "PDF HD Les Châteaux", url: "/cours/vtc/LES_CHATEAUX.pdf" }],
    },
    {
      id: 2, actif: true,
      titre: "Les Gares",
      sousTitre: "Perrache, Saint-Paul, Vaise, Part-Dieu, Jean Macé...",
      description: "Les principales gares SNCF de Lyon et leur localisation.",
      fichiers: [{ nom: "PDF HD Les Gares", url: "/cours/vtc/LES_GARES.pdf" }],
    },
    {
      id: 3, actif: true,
      titre: "Les Hôpitaux",
      sousTitre: "Hôpitaux et cliniques de Lyon et sa métropole",
      description: "Localisation des principaux établissements de santé lyonnais.",
      fichiers: [{ nom: "PDF HD Les Hôpitaux", url: "/cours/vtc/LES_HOPITAUX.pdf" }],
    },
    {
      id: 4, actif: true,
      titre: "Les Mairies",
      sousTitre: "Mairies d'arrondissement et mairies de communes",
      description: "Adresses des mairies de Lyon et des communes environnantes.",
      fichiers: [{ nom: "PDF HD Les Mairies", url: "/cours/vtc/LES_MAIRIES.pdf" }],
    },
    {
      id: 5, actif: true,
      titre: "Les Églises",
      sousTitre: "Cathédrales, basiliques et églises remarquables",
      description: "Les lieux de culte historiques et remarquables de Lyon.",
      fichiers: [{ nom: "PDF HD Les Églises", url: "/cours/vtc/LES_EGLISES.pdf" }],
    },
    {
      id: 6, actif: true,
      titre: "Les Fresques",
      sousTitre: "Fresques murales et art urbain lyonnais",
      description: "Les fresques monumentales de Lyon : Fresque des Lyonnais, Mur des Canuts...",
      fichiers: [{ nom: "PDF HD Les Fresques", url: "/cours/vtc/LES_FRESQUES.pdf" }],
    },
    {
      id: 7, actif: true,
      titre: "Les Consulats",
      sousTitre: "Consulats et représentations diplomatiques à Lyon",
      description: "Liste des consulats et représentations étrangères présents à Lyon.",
      fichiers: [{ nom: "PDF HD Les Consulats", url: "/cours/vtc/LES_CONSULATS.pdf" }],
    },
    {
      id: 8, actif: true,
      titre: "Les Commissariats",
      sousTitre: "Commissariats de police de Lyon et environs",
      description: "Localisation des commissariats de police dans la métropole lyonnaise.",
      fichiers: [{ nom: "PDF HD Les Commissariats", url: "/cours/vtc/LES_COMMISSARIATS.pdf" }],
    },
    {
      id: 9, actif: true,
      titre: "Les Hôtels",
      sousTitre: "Hôtels et hébergements de Lyon",
      description: "Les principaux hôtels de Lyon à connaître pour le transport de passagers.",
      fichiers: [{ nom: "PDF HD Les Hôtels", url: "/cours/vtc/LES_HOTELS.pdf" }],
    },
    {
      id: 10, actif: true,
      titre: "Les Divers",
      sousTitre: "Autres lieux importants à connaître",
      description: "Lieux divers importants pour un chauffeur de taxi à Lyon.",
      fichiers: [{ nom: "PDF HD Les Divers", url: "/cours/vtc/LES_DIVERS.pdf" }],
    },
    {
      id: 11, actif: true,
      titre: "Les Musées",
      sousTitre: "Musées et lieux culturels de Lyon",
      description: "Les principaux musées lyonnais à connaître.",
      fichiers: [{ nom: "PDF HD Les Musées", url: "/cours/vtc/LES_MUSEES.pdf" }],
    },
    {
      id: 12, actif: true,
      titre: "Les Parcs",
      sousTitre: "Parcs et espaces verts de Lyon et sa métropole",
      description: "Les parcs et jardins incontournables de la région lyonnaise.",
      fichiers: [{ nom: "PDF HD Les Parcs", url: "/cours/vtc/LES_PARCS.pdf" }],
    },
    {
      id: 13, actif: true,
      titre: "Les Personnalités Publiques Lyonnaises",
      sousTitre: "Personnalités historiques et contemporaines de Lyon",
      description: "Les grandes figures lyonnaises à connaître.",
      fichiers: [{ nom: "PDF HD Les Personnalités", url: "/cours/vtc/LES_PERSONNALITES_PUBLIQUES_LYONNAISES.pdf" }],
    },
    {
      id: 14, actif: true,
      titre: "Les Salles de Spectacles",
      sousTitre: "Théâtres, salles de concert et lieux de spectacle",
      description: "Les principales salles de spectacles lyonnaises.",
      fichiers: [{ nom: "PDF HD Les Salles de Spectacles", url: "/cours/vtc/LES_SALLES_DE_SPECTACLES.pdf" }],
    },
    {
      id: 15, actif: true,
      titre: "Les Vins",
      sousTitre: "Vignobles et appellations de la région lyonnaise",
      description: "Les vins et vignobles à connaître autour de Lyon.",
      fichiers: [{ nom: "PDF HD Les Vins", url: "/cours/vtc/LES_VINS.pdf" }],
    },
    {
      id: 16, actif: true,
      titre: "Lyon et ses Arrondissements",
      sousTitre: "Les 9 arrondissements de Lyon et leurs caractéristiques",
      description: "Présentation géographique et administrative des arrondissements lyonnais.",
      fichiers: [{ nom: "PDF HD Lyon et ses Arrondissements", url: "/cours/vtc/LYON_ET_SES_ARRONDISSEMENTS.pdf" }],
    },
    {
      id: 17, actif: true,
      titre: "Stations de Taxi",
      sousTitre: "Emplacements des stations de taxi à Lyon",
      description: "Localisation de toutes les stations de taxi dans Lyon et sa métropole.",
      fichiers: [{ nom: "PDF HD Stations de Taxi", url: "/cours/vtc/STATIONS_DE_TAXI.pdf" }],
    },
  ],
  exercices: [
    // ===== Quiz interactifs — Tous intégrés directement =====
    // Administrations
    ...CONNAISSANCES_VILLE_QUIZZES.filter(q => q.id === 7001),
    // Autoroutes
    QUIZ_AUTOROUTES,
    // Avenues
    QUIZ_AVENUES,
    // Boulevards
    QUIZ_BOULEVARDS,
    // Consulats
    ...CONNAISSANCES_VILLE_QUIZZES.filter(q => q.id === 7002),
    // Cours
    QUIZ_COURS,
    // Divers
    ...CONNAISSANCES_VILLE_QUIZZES.filter(q => q.id === 7005),
    // Hôpitaux et Cliniques
    ...CONNAISSANCES_VILLE_QUIZZES.filter(q => q.id === 7003),
    // Musées
    ...CONNAISSANCES_VILLE_QUIZZES.filter(q => q.id === 7004),
    // Places
    QUIZ_PLACES,
    // Ponts
    ...CONNAISSANCES_VILLE_QUIZZES.filter(q => q.id === 7006),
    // Quais
    QUIZ_QUAIS,
    // Rues
    QUIZ_RUES,
    // Stations de Taxis
    ...CONNAISSANCES_VILLE_QUIZZES.filter(q => q.id === 7008),
    // Statues
    ...CONNAISSANCES_VILLE_QUIZZES.filter(q => q.id === 7007),
    // Jeux interactifs
    {
      id: 17, actif: true,
      titre: "🎮 Jeu de la Légende de Lyon",
      sousTitre: "Jeu interactif sur les lieux emblématiques de Lyon",
      fichiers: [{ nom: "Ouvrir le jeu ↗", url: "https://lyon-explorer-map.lovable.app" }],
    },
    {
      id: 18, actif: true,
      titre: "🗺️ Jeu des Quartiers",
      sousTitre: "Exercice interactif pour apprendre les quartiers de Lyon",
      fichiers: [{ nom: "Ouvrir le jeu Quartiers ↗", url: "https://lyon-explorer-map.lovable.app" }],
    },
    {
      id: 19, actif: true,
      titre: "🏘️ Les Communes",
      sousTitre: "Exercice interactif sur les communes de la métropole lyonnaise",
      fichiers: [{ nom: "Ouvrir l'exercice Communes ↗", url: "https://lyon-explorer-map.lovable.app" }],
    },
    {
      id: 20, actif: true,
      titre: "❓ Quiz Lyon",
      sousTitre: "Quiz interactif sur les connaissances de la ville de Lyon",
      fichiers: [{ nom: "Ouvrir le Quiz ↗", url: "https://lyon-explorer-map.lovable.app" }],
    },
    {
      id: 21, actif: true,
      titre: "📍 Carte Interactive de Lyon",
      sousTitre: "Explorer les lieux importants de Lyon sur une carte interactive",
      fichiers: [{ nom: "Ouvrir la Carte ↗", url: "https://lyon-explorer-map.lovable.app" }],
    },
  ],
};
