export interface ExerciceChoix {
  lettre: string;
  texte: string;
  correct?: boolean;
}

export interface ExerciceQuestion {
  id: number;
  enonce: string;
  choix: ExerciceChoix[];
}

export interface ExerciceItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
  questions?: ExerciceQuestion[];
  fichiers?: { nom: string; url: string }[];
}
