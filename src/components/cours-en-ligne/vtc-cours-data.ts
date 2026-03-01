// ===== Données du module "2. COURS ET EXERCICES VTC" =====
// Structure : 7 matières (A à G), fichiers PowerPoint originaux

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  description?: string;
  image?: string;
  actif: boolean;
  fichiers?: { nom: string; url: string }[];
  slidesKey?: string; // clé pour ouvrir le viewer de slides
}

interface ExerciceChoix {
  lettre: string;
  texte: string;
  correct?: boolean;
}

interface ExerciceQuestion {
  id: number;
  enonce: string;
  choix: ExerciceChoix[];
}

interface ExerciceItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
  questions?: ExerciceQuestion[];
}

interface ModuleData {
  id: number;
  nom: string;
  description: string;
  cours: ContentItem[];
  exercices: ExerciceItem[];
}

// =============================================
// MATIÈRE A — RÉGLEMENTATION T3P (2 parties)
// =============================================

const MATIERE_A: ContentItem[] = [
  {
    id: 1001, actif: true,
    titre: "A. RÉGLEMENTATION T3P — Partie 1",
    sousTitre: "Transport public, loi LOTI, taxis, VTC, VMDTR, assurances, formation continue",
    fichiers: [
      { nom: "PowerPoint Partie 1", url: "/cours/vtc/A_T3P_partie_1.pptx" },
      { nom: "Version PDF HD", url: "/cours/vtc/T3P_partie_1_2.pdf" },
    ],
  },
  {
    id: 1002, actif: true,
    titre: "A. RÉGLEMENTATION T3P — Partie 2",
    sousTitre: "Suite de la réglementation T3P",
    slidesKey: "t3p-partie2",
    fichiers: [
      { nom: "PowerPoint Partie 2", url: "/cours/vtc/A_T3P_partie_2_vrai.pptx" },
    ],
  },
  {
    id: 1003, actif: true,
    titre: "A. RÉGLEMENTATION T3P — Partie 3",
    sousTitre: "Réglementation T3P (suite)",
    fichiers: [
      { nom: "PowerPoint Partie 3", url: "/cours/vtc/A_T3P_partie_3_vrai.pptx" },
    ],
  },
  {
    id: 1004, actif: true,
    titre: "A. RÉGLEMENTATION T3P — Partie 4",
    sousTitre: "Réglementation T3P (suite)",
    fichiers: [
      { nom: "PowerPoint Partie 4", url: "/cours/vtc/A_T3P_partie_4_vrai.pptx" },
    ],
  },
  {
    id: 1005, actif: true,
    titre: "A. RÉGLEMENTATION T3P — Partie 5",
    sousTitre: "Réglementation T3P (fin)",
    fichiers: [
      { nom: "PowerPoint Partie 5", url: "/cours/vtc/A_T3P_partie_5_vrai.pptx" },
    ],
  },
];

// =============================================
// MATIÈRE B — GESTION (3 parties)
// =============================================

const MATIERE_B: ContentItem[] = [
  {
    id: 2001, actif: true,
    titre: "B. GESTION — Partie 1",
    sousTitre: "Entrepreneurs et Formes Juridiques",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/B_Gestion_1.pdf" },
    ],
  },
  {
    id: 2002, actif: true,
    titre: "B. GESTION — Partie 2",
    sousTitre: "Comptabilité et Fiscalité",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/B_Gestion_2.pdf" },
    ],
  },
  {
    id: 2003, actif: true,
    titre: "B. GESTION — Partie 3",
    sousTitre: "Gestion financière et Administrative",
    fichiers: [
      { nom: "PDF HD Partie 3", url: "/cours/vtc/B_Gestion_3.pdf" },
    ],
  },
];

// =============================================
// MATIÈRE C — SÉCURITÉ ROUTIÈRE (3 parties)
// =============================================

const MATIERE_C: ContentItem[] = [
  {
    id: 3001, actif: true,
    titre: "C. SÉCURITÉ ROUTIÈRE — Partie 1",
    sousTitre: "Sécurité routière et prévention des risques",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/C_Securite_Routiere_1.pdf" },
    ],
  },
  {
    id: 3002, actif: true,
    titre: "C. SÉCURITÉ ROUTIÈRE — Partie 2",
    sousTitre: "Sécurité routière (suite)",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/C_Securite_Routiere_2.pdf" },
    ],
  },
  {
    id: 3003, actif: true,
    titre: "C. SÉCURITÉ ROUTIÈRE — Partie 3",
    sousTitre: "Sécurité routière (fin)",
    fichiers: [
      { nom: "PDF HD Partie 3", url: "/cours/vtc/C_Securite_Routiere_3.pdf" },
    ],
  },
];

// =============================================
// MATIÈRE D — FRANÇAIS
// =============================================

const MATIERE_D: ContentItem[] = [
  {
    id: 4001, actif: true,
    titre: "D. FRANÇAIS",
    sousTitre: "Expression et compréhension écrite",
    fichiers: [
      { nom: "PDF HD Français", url: "/cours/vtc/D_Francais_1.pdf" },
    ],
  },
];

// =============================================
// MATIÈRE E — ANGLAIS
// =============================================

const MATIERE_E: ContentItem[] = [
  {
    id: 5001, actif: true,
    titre: "E. ANGLAIS — Partie 1",
    sousTitre: "Expression et compréhension en anglais",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/E_Anglais_1.pdf" },
    ],
  },
  {
    id: 5002, actif: true,
    titre: "E. ANGLAIS — Partie 2",
    sousTitre: "Anglais (suite)",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/E_Anglais_2.pdf" },
    ],
  },
  {
    id: 5003, actif: true,
    titre: "E. ANGLAIS — Partie 3",
    sousTitre: "Anglais (suite)",
    fichiers: [
      { nom: "PDF HD Partie 3", url: "/cours/vtc/E_Anglais_3.pdf" },
    ],
  },
  {
    id: 5004, actif: true,
    titre: "E. ANGLAIS — Partie 4",
    sousTitre: "Anglais (fin)",
    fichiers: [
      { nom: "PDF HD Partie 4", url: "/cours/vtc/E_Anglais_4.pdf" },
    ],
  },
];

// =============================================
// MATIÈRE F — RÉGLEMENTATION SPÉCIFIQUE VTC
// =============================================

const MATIERE_F: ContentItem[] = [
  {
    id: 6001, actif: true,
    titre: "F. RÉGLEMENTATION NATIONALE — Partie 1",
    sousTitre: "Réglementation nationale spécifique aux VTC",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/F_Nationale_1.pdf" },
    ],
  },
  {
    id: 6002, actif: true,
    titre: "F. RÉGLEMENTATION NATIONALE — Partie 2",
    sousTitre: "Réglementation nationale (suite)",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/F_Nationale_2.pdf" },
    ],
  },
  {
    id: 6003, actif: true,
    titre: "F. RÉGLEMENTATION SPÉCIFIQUE VTC",
    sousTitre: "Réglementation spécifique aux VTC",
    fichiers: [
      { nom: "PDF HD", url: "/cours/vtc/F_Reglementation_Specifique_1.pdf" },
    ],
  },
  {
    id: 6004, actif: true,
    titre: "F. RÉGLEMENTATION LOCALE — Partie 1",
    sousTitre: "Réglementation locale",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/F_Locale_1.pdf" },
    ],
  },
  {
    id: 6005, actif: true,
    titre: "F. RÉGLEMENTATION LOCALE — Partie 2",
    sousTitre: "Réglementation locale (suite)",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/F_Locale_2.pdf" },
    ],
  },
  {
    id: 6006, actif: true,
    titre: "F. RÉGLEMENTATION LOCALE — Partie 3",
    sousTitre: "Réglementation locale (fin)",
    fichiers: [
      { nom: "PDF HD Partie 3", url: "/cours/vtc/F_Locale_3.pdf" },
    ],
  },
];

// =============================================
// MATIÈRE G — DÉVELOPPEMENT COMMERCIAL
// =============================================

const MATIERE_G: ContentItem[] = [
  {
    id: 7001, actif: true,
    titre: "G. DÉVELOPPEMENT COMMERCIAL",
    sousTitre: "Marketing et développement commercial VTC",
    fichiers: [
      { nom: "PDF HD Marketing", url: "/cours/vtc/G_Marketing_1.pdf" },
    ],
  },
];

// =============================================
// ASSEMBLAGE DU MODULE COMPLET
// =============================================

export const VTC_COURS_DATA: ModuleData = {
  id: 2,
  nom: "2.COURS ET EXERCICES VTC",
  description: "Cours complets pour les 7 matières de l'examen VTC : A. Réglementation T3P, B. Gestion, C. Sécurité Routière, D. Français, E. Anglais, F. Réglementation Spécifique VTC, G. Développement Commercial.",
  cours: [
    ...MATIERE_A,
    ...MATIERE_B,
    ...MATIERE_C,
    ...MATIERE_D,
    ...MATIERE_E,
    ...MATIERE_F,
    ...MATIERE_G,
  ],
  exercices: [],
};
