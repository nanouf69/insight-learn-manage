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
  ],
  exercices: [],
};
