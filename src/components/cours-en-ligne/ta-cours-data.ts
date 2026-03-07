// ===== Données du module "COURS ET EXERCICES TA" =====
// Passerelle Taxi : uniquement Réglementation Nationale + Locale (depuis TAXI)
import { REGLEMENTATION_NATIONALE_EXERCICES, REGLEMENTATION_LOCALE_EXERCICES } from "./exercices/reglementation-exercices-data";

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

export interface MatiereSection {
  cours: ContentItem[];
  exercices: ExerciceItem[];
}

// =============================================
// MATIÈRE 1 — RÉGLEMENTATION NATIONALE (2 parties)
// =============================================
const MATIERE_NATIONALE: ContentItem[] = [
  {
    id: 40001, actif: true,
    titre: "F. RÉGLEMENTATION NATIONALE — Partie 1",
    sousTitre: "Réglementation nationale",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/F_Nationale_1.pdf" },
    ],
  },
  {
    id: 40002, actif: true,
    titre: "F. RÉGLEMENTATION NATIONALE — Partie 2",
    sousTitre: "Réglementation nationale (suite)",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/F_Nationale_2.pdf" },
    ],
  },
];

// =============================================
// MATIÈRE 2 — RÉGLEMENTATION LOCALE (3 parties)
// =============================================
const MATIERE_LOCALE: ContentItem[] = [
  {
    id: 40003, actif: true,
    titre: "F. RÉGLEMENTATION LOCALE — Partie 1",
    sousTitre: "Réglementation locale",
    fichiers: [
      { nom: "PDF HD Partie 1", url: "/cours/vtc/F_Locale_1.pdf" },
    ],
  },
  {
    id: 40004, actif: true,
    titre: "F. RÉGLEMENTATION LOCALE — Partie 2",
    sousTitre: "Réglementation locale (suite)",
    fichiers: [
      { nom: "PDF HD Partie 2", url: "/cours/vtc/F_Locale_2.pdf" },
    ],
  },
  {
    id: 40005, actif: true,
    titre: "F. RÉGLEMENTATION LOCALE — Partie 3",
    sousTitre: "Réglementation locale (fin)",
    fichiers: [
      { nom: "PDF HD Partie 3", url: "/cours/vtc/F_Locale_3.pdf" },
    ],
  },
];

// =============================================
// ASSEMBLAGE — 2 matières
// =============================================
export const TA_SECTIONS: MatiereSection[] = [
  { cours: MATIERE_NATIONALE, exercices: REGLEMENTATION_NATIONALE_EXERCICES },
  { cours: MATIERE_LOCALE, exercices: REGLEMENTATION_LOCALE_EXERCICES },
];

export const TA_COURS_DATA: ModuleData = {
  id: 40,
  nom: "2.COURS ET EXERCICES TA",
  description: "Cours et exercices Passerelle Taxi : Réglementation Nationale et Réglementation Locale.",
  cours: TA_SECTIONS.flatMap(s => s.cours),
  exercices: TA_SECTIONS.flatMap(s => s.exercices),
};
