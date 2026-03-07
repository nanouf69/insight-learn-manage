// ===== Données du module "COURS ET EXERCICES VA" =====
// Passerelle VTC : uniquement Développement Commercial + Réglementation Spécifique VTC
import { DEV_COMMERCIAL_EXERCICES } from "./exercices/dev-commercial-exercices-data";
import { REGLEMENTATION_SPECIFIQUE_VTC_EXERCICES } from "./exercices/reglementation-exercices-data";

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
  fichiers?: { nom: string; url: string }[];
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
// MATIÈRE 1 — DÉVELOPPEMENT COMMERCIAL
// =============================================
const MATIERE_MARKETING: ContentItem[] = [
  {
    id: 41001, actif: true,
    titre: "G. DÉVELOPPEMENT COMMERCIAL",
    sousTitre: "Marketing et développement commercial VTC",
    fichiers: [
      { nom: "PDF HD Marketing", url: "/cours/vtc/G_Marketing_1.pdf" },
    ],
  },
];

// =============================================
// MATIÈRE 2 — RÉGLEMENTATION SPÉCIFIQUE VTC
// =============================================
const MATIERE_SPECIFIQUE: ContentItem[] = [
  {
    id: 41002, actif: true,
    titre: "F. RÉGLEMENTATION SPÉCIFIQUE VTC",
    sousTitre: "Réglementation spécifique aux VTC",
    fichiers: [
      { nom: "PDF HD", url: "/cours/vtc/F_Reglementation_Specifique_1.pdf" },
    ],
  },
];

// =============================================
// ASSEMBLAGE — 2 matières
// =============================================
export const VA_SECTIONS: MatiereSection[] = [
  { cours: MATIERE_MARKETING, exercices: DEV_COMMERCIAL_EXERCICES },
  { cours: MATIERE_SPECIFIQUE, exercices: REGLEMENTATION_SPECIFIQUE_VTC_EXERCICES },
];

export const VA_COURS_DATA: ModuleData = {
  id: 41,
  nom: "2.COURS ET EXERCICES VA",
  description: "Cours et exercices Passerelle VTC : Développement Commercial et Réglementation Spécifique VTC.",
  cours: VA_SECTIONS.flatMap(s => s.cours),
  exercices: VA_SECTIONS.flatMap(s => s.exercices),
};
