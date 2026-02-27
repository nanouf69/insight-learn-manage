// ===== Données du module "2. COURS ET EXERCICES VTC" =====
// Structure : 7 matières (A à G), 1 carte par matière — contenu sur PowerPoint

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  description?: string;
  actif: boolean;
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
// MATIÈRE A — RÉGLEMENTATION T3P
// =============================================

const MATIERE_A: ContentItem[] = [
  {
    id: 1001, actif: true,
    titre: "A. RÉGLEMENTATION T3P",
    sousTitre: "Réglementation du transport public particulier de personnes",
  },
];

// =============================================
// MATIÈRE B — GESTION
// =============================================

const MATIERE_B: ContentItem[] = [
  {
    id: 2001, actif: true,
    titre: "B. GESTION",
    sousTitre: "Gestion d'entreprise et comptabilité",
  },
];

// =============================================
// MATIÈRE C — SÉCURITÉ ROUTIÈRE
// =============================================

const MATIERE_C: ContentItem[] = [
  {
    id: 3001, actif: true,
    titre: "C. SÉCURITÉ ROUTIÈRE",
    sousTitre: "Sécurité routière et prévention des risques",
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
  },
];

// =============================================
// MATIÈRE E — ANGLAIS
// =============================================

const MATIERE_E: ContentItem[] = [
  {
    id: 5001, actif: true,
    titre: "E. ANGLAIS",
    sousTitre: "Expression et compréhension en anglais",
  },
];

// =============================================
// MATIÈRE F — RÉGLEMENTATION SPÉCIFIQUE VTC
// =============================================

const MATIERE_F: ContentItem[] = [
  {
    id: 6001, actif: true,
    titre: "F. RÉGLEMENTATION SPÉCIFIQUE VTC",
    sousTitre: "Réglementation nationale spécifique aux VTC",
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
