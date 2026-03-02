// ===== Données du module "7. CONNAISSANCES DE LA VILLE TAXI" =====

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
      fichiers: [{ nom: "Les Châteaux (Word)", url: "/cours/vtc/LES_CHATEAUX.docx" }],
    },
    {
      id: 2, actif: true,
      titre: "Les Gares",
      sousTitre: "Perrache, Saint-Paul, Vaise, Part-Dieu, Jean Macé...",
      description: "Les principales gares SNCF de Lyon et leur localisation.",
      fichiers: [{ nom: "Les Gares (Word)", url: "/cours/vtc/LES_GARES.docx" }],
    },
    {
      id: 3, actif: true,
      titre: "Les Hôpitaux",
      sousTitre: "Hôpitaux et cliniques de Lyon et sa métropole",
      description: "Localisation des principaux établissements de santé lyonnais.",
      fichiers: [{ nom: "Les Hôpitaux (Word)", url: "/cours/vtc/LES_HOPITAUX.docx" }],
    },
    {
      id: 4, actif: true,
      titre: "Les Mairies",
      sousTitre: "Mairies d'arrondissement et mairies de communes",
      description: "Adresses des mairies de Lyon et des communes environnantes.",
      fichiers: [{ nom: "Les Mairies (Word)", url: "/cours/vtc/LES_MAIRIES.docx" }],
    },
    {
      id: 5, actif: true,
      titre: "Les Églises",
      sousTitre: "Cathédrales, basiliques et églises remarquables",
      description: "Les lieux de culte historiques et remarquables de Lyon.",
      fichiers: [{ nom: "Les Églises (Word)", url: "/cours/vtc/LES_EGLISES.docx" }],
    },
    {
      id: 6, actif: true,
      titre: "Les Fresques",
      sousTitre: "Fresques murales et art urbain lyonnais",
      description: "Les fresques monumentales de Lyon : Fresque des Lyonnais, Mur des Canuts...",
      fichiers: [{ nom: "Les Fresques (Word)", url: "/cours/vtc/LES_FRESQUES.docx" }],
    },
    {
      id: 7, actif: true,
      titre: "Les Consulats",
      sousTitre: "Consulats et représentations diplomatiques à Lyon",
      description: "Liste des consulats et représentations étrangères présents à Lyon.",
      fichiers: [{ nom: "Les Consulats (Word)", url: "/cours/vtc/LES_CONSULATS.docx" }],
    },
    {
      id: 8, actif: true,
      titre: "Les Commissariats",
      sousTitre: "Commissariats de police de Lyon et environs",
      description: "Localisation des commissariats de police dans la métropole lyonnaise.",
      fichiers: [{ nom: "Les Commissariats (Word)", url: "/cours/vtc/LES_COMMISSARIATS.docx" }],
    },
    {
      id: 9, actif: true,
      titre: "Les Hôtels",
      sousTitre: "Hôtels et hébergements de Lyon",
      description: "Les principaux hôtels de Lyon à connaître pour le transport de passagers.",
      fichiers: [{ nom: "Les Hôtels (Word)", url: "/cours/vtc/LES_HOTELS.docx" }],
    },
    {
      id: 10, actif: true,
      titre: "Les Divers",
      sousTitre: "Autres lieux importants à connaître",
      description: "Lieux divers importants pour un chauffeur de taxi à Lyon.",
      fichiers: [{ nom: "Les Divers (Word)", url: "/cours/vtc/LES_DIVERS.docx" }],
    },
    {
      id: 11, actif: true,
      titre: "Les Musées",
      sousTitre: "Musées et lieux culturels de Lyon",
      description: "Les principaux musées lyonnais à connaître.",
      fichiers: [{ nom: "Les Musées (Word)", url: "/cours/vtc/LES_MUSEES.docx" }],
    },
    {
      id: 12, actif: true,
      titre: "Les Parcs",
      sousTitre: "Parcs et espaces verts de Lyon et sa métropole",
      description: "Les parcs et jardins incontournables de la région lyonnaise.",
      fichiers: [{ nom: "Les Parcs (Word)", url: "/cours/vtc/LES_PARCS.docx" }],
    },
    {
      id: 13, actif: true,
      titre: "Les Personnalités Publiques Lyonnaises",
      sousTitre: "Personnalités historiques et contemporaines de Lyon",
      description: "Les grandes figures lyonnaises à connaître.",
      fichiers: [{ nom: "Les Personnalités (Word)", url: "/cours/vtc/LES_PERSONNALITES_PUBLIQUES_LYONNAISES.docx" }],
    },
    {
      id: 14, actif: true,
      titre: "Les Salles de Spectacles",
      sousTitre: "Théâtres, salles de concert et lieux de spectacle",
      description: "Les principales salles de spectacles lyonnaises.",
      fichiers: [{ nom: "Les Salles de Spectacles (Word)", url: "/cours/vtc/LES_SALLES_DE_SPECTACLES.docx" }],
    },
    {
      id: 15, actif: true,
      titre: "Les Vins",
      sousTitre: "Vignobles et appellations de la région lyonnaise",
      description: "Les vins et vignobles à connaître autour de Lyon.",
      fichiers: [{ nom: "Les Vins (Word)", url: "/cours/vtc/LES_VINS.docx" }],
    },
    {
      id: 16, actif: true,
      titre: "Lyon et ses Arrondissements",
      sousTitre: "Les 9 arrondissements de Lyon et leurs caractéristiques",
      description: "Présentation géographique et administrative des arrondissements lyonnais.",
      fichiers: [{ nom: "Lyon et ses Arrondissements (Word)", url: "/cours/vtc/LYON_ET_SES_ARRONDISSEMENTS.docx" }],
    },
    {
      id: 17, actif: true,
      titre: "Stations de Taxi",
      sousTitre: "Emplacements des stations de taxi à Lyon",
      description: "Localisation de toutes les stations de taxi dans Lyon et sa métropole.",
      fichiers: [{ nom: "Stations de Taxi (Word)", url: "/cours/vtc/STATIONS_DE_TAXI.docx" }],
    },
  ],
  exercices: [],
};
