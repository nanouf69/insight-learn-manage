// ===== Données du module "10. COURS ET EXERCICES TAXI" =====
// Mêmes matières que VTC sauf : pas de Réglementation Spécifique VTC (F.6003) ni de Marketing (G)
import { T3P_EXERCICES } from "./exercices/t3p-exercices-data";
import { ANGLAIS_EXERCICES } from "./exercices/anglais-exercices-data";
import { FRANCAIS_EXERCICES } from "./exercices/francais-exercices-data";
import { GESTION_EXERCICES } from "./exercices/gestion-exercices-data";
import { REGLEMENTATION_NATIONALE_EXERCICES, REGLEMENTATION_LOCALE_EXERCICES } from "./exercices/reglementation-exercices-data";
import { SECURITE_ROUTIERE_EXERCICES } from "./exercices/securite-routiere-exercices-data";

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  description?: string;
  image?: string;
  actif: boolean;
  fichiers?: { nom: string; url: string }[];
  slidesKey?: string;
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

// =============================================
// MATIÈRE A — RÉGLEMENTATION T3P (2 parties)
// =============================================
const MATIERE_A: ContentItem[] = [
  {
    id: 10001, actif: true,
    titre: "A. RÉGLEMENTATION T3P — Partie 1",
    sousTitre: "Transport public, loi LOTI, taxis, VTC, VMDTR, assurances, formation continue",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/A_T3P_1.pdf" },
    ],
  },
  {
    id: 10002, actif: true,
    titre: "A. RÉGLEMENTATION T3P — Partie 2",
    sousTitre: "Suite de la réglementation T3P",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/A_T3P_2.pdf" },
    ],
  },
];

// =============================================
// MATIÈRE B — GESTION (3 parties)
// =============================================
const MATIERE_B: ContentItem[] = [
  {
    id: 10003, actif: true,
    titre: "B. GESTION — Partie 1",
    sousTitre: "Entrepreneurs et Formes Juridiques",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/B_Gestion_1.pdf" },
    ],
  },
  {
    id: 10004, actif: true,
    titre: "B. GESTION — Partie 2",
    sousTitre: "Comptabilité et Fiscalité",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/B_Gestion_2.pdf" },
    ],
  },
  {
    id: 10005, actif: true,
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
    id: 10006, actif: true,
    titre: "C. SÉCURITÉ ROUTIÈRE — Partie 1",
    sousTitre: "Sécurité routière et prévention des risques",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/C_Securite_Routiere_1.pdf" },
    ],
  },
  {
    id: 10007, actif: true,
    titre: "C. SÉCURITÉ ROUTIÈRE — Partie 2",
    sousTitre: "Sécurité routière (suite)",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/C_Securite_Routiere_2.pdf" },
    ],
  },
  {
    id: 10008, actif: true,
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
    id: 10009, actif: true,
    titre: "D. FRANÇAIS",
    sousTitre: "Expression et compréhension écrite",
    fichiers: [
      { nom: "PDF HD Français", url: "/cours/vtc/D_Francais_1.pdf" },
    ],
  },
];

// =============================================
// MATIÈRE E — ANGLAIS (4 parties)
// =============================================
const MATIERE_E: ContentItem[] = [
  {
    id: 10010, actif: true,
    titre: "E. ANGLAIS — Partie 1",
    sousTitre: "Expression et compréhension en anglais",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/E_Anglais_1.pdf" },
    ],
  },
  {
    id: 10011, actif: true,
    titre: "E. ANGLAIS — Partie 2",
    sousTitre: "Anglais (suite)",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/E_Anglais_2.pdf" },
    ],
  },
  {
    id: 10012, actif: true,
    titre: "E. ANGLAIS — Partie 3",
    sousTitre: "Anglais (suite)",
    fichiers: [
      { nom: "PDF HD Partie 3", url: "/cours/vtc/E_Anglais_3.pdf" },
    ],
  },
  {
    id: 10013, actif: true,
    titre: "E. ANGLAIS — Partie 4",
    sousTitre: "Anglais (fin)",
    fichiers: [
      { nom: "PDF HD Partie 4", url: "/cours/vtc/E_Anglais_4.pdf" },
    ],
  },
];

// =============================================
// MATIÈRE F — RÉGLEMENTATION (sans Spécifique VTC)
// Nationale + Locale uniquement
// =============================================
const MATIERE_F: ContentItem[] = [
  {
    id: 10014, actif: true,
    titre: "F. RÉGLEMENTATION NATIONALE — Partie 1",
    sousTitre: "Réglementation nationale",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/F_Nationale_1.pdf" },
    ],
  },
  {
    id: 10015, actif: true,
    titre: "F. RÉGLEMENTATION NATIONALE — Partie 2",
    sousTitre: "Réglementation nationale (suite)",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/F_Nationale_2.pdf" },
    ],
  },
  {
    id: 10016, actif: true,
    titre: "F. RÉGLEMENTATION LOCALE — Partie 1",
    sousTitre: "Réglementation locale",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/F_Locale_1.pdf" },
    ],
  },
  {
    id: 10017, actif: true,
    titre: "F. RÉGLEMENTATION LOCALE — Partie 2",
    sousTitre: "Réglementation locale (suite)",
    fichiers: [
      { nom: "PowerPoint Partie 2", url: "/cours/vtc/F_Locale_2.pptx" },
    ],
  },
  {
    id: 10018, actif: true,
    titre: "F. RÉGLEMENTATION LOCALE — Partie 3",
    sousTitre: "Réglementation locale (fin)",
    fichiers: [
      { nom: "PDF HD Partie 3", url: "/cours/vtc/F_Locale_3.pdf" },
    ],
  },
];

// =============================================
// ASSEMBLAGE DU MODULE COMPLET — ordonné par matière
// Cours A → Exercices A → Cours B → Exercices B → etc.
// =============================================

export interface MatiereSection {
  cours: ContentItem[];
  exercices: ExerciceItem[];
}

export const TAXI_SECTIONS: MatiereSection[] = [
  { cours: MATIERE_A, exercices: T3P_EXERCICES },
  { cours: MATIERE_B, exercices: GESTION_EXERCICES },
  { cours: MATIERE_C, exercices: SECURITE_ROUTIERE_EXERCICES },
  { cours: MATIERE_D, exercices: FRANCAIS_EXERCICES },
  { cours: MATIERE_E, exercices: ANGLAIS_EXERCICES },
  { cours: MATIERE_F, exercices: [...REGLEMENTATION_NATIONALE_EXERCICES, ...REGLEMENTATION_LOCALE_EXERCICES] },
];

export const TAXI_COURS_DATA: ModuleData = {
  id: 10,
  nom: "2.COURS ET EXERCICES TAXI",
  description: "Cours complets pour les matières de l'examen TAXI : A. Réglementation T3P, B. Gestion, C. Sécurité Routière, D. Français, E. Anglais, F. Réglementation Nationale et Locale.",
  cours: TAXI_SECTIONS.flatMap(s => s.cours),
  exercices: TAXI_SECTIONS.flatMap(s => s.exercices),
};
