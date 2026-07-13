import type { ExamenBlanc, Matiere, Question } from "./examens-blancs-data";

export type ReponseQCM = string[];
export type ReponseQRC = string;
export type Reponses = { [questionId: number]: ReponseQCM | ReponseQRC };

export interface CorrectionQRC {
  estCorrect: boolean;
  pointsObtenus: number;
  nombrefautes: number;
  explication: string;
}

export type CorrectionCache = { [questionId: number]: CorrectionQRC | "loading" | "error" };

export interface ResultatMatiere {
  resultId?: string;
  matiereId: string;
  nomMatiere: string;
  noteObtenue: number;
  maxPoints: number;
  noteSur: number;
  noteEliminatoire: number;
  coefficient: number;
  admis: boolean;
  reponses: Reponses;
  correctionsIA?: CorrectionCache;
  tentative?: number;
  /** true if this matière was NOT attempted by the learner (placeholder row) */
  nonPassee?: boolean;
}

export interface ExamScoreItem {
  matiere_id: string;
  matiere_nom: string;
  note_sur_20: number;
  score_obtenu: number;
  score_max: number;
  created_at?: string;
  completed_at?: string;
  lookupKeys: string[];
  /** Réponses brutes stockées (pour recalcul au barème actuel dans les vues) */
  reponses?: Record<string, any> | null;
  /** Corrections QRC stockées, utilisées dans le même calcul que l'écran résultats */
  correctionsIA?: CorrectionCache | null;
}

export type { ExamenBlanc, Matiere, Question };
