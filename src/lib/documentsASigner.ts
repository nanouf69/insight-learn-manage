export type ChampType = "signature" | "texte" | "nombre";

export interface ChampDocument {
  id: string;
  page: number;
  /** Position et taille en pourcentage de la page (0-100) */
  x: number;
  y: number;
  w: number;
  h: number;
  type: ChampType;
  label: string;
  requis: boolean;
}

export const CHAMP_LABELS: Record<ChampType, string> = {
  signature: "Zone de signature",
  texte: "Zone texte",
  nombre: "Zone chiffre",
};

export const CHAMP_COLORS: Record<ChampType, string> = {
  signature: "border-primary bg-primary/15",
  texte: "border-emerald-500 bg-emerald-500/15",
  nombre: "border-amber-500 bg-amber-500/15",
};

export const defaultTaille = (type: ChampType) =>
  type === "signature" ? { w: 26, h: 9 } : { w: 22, h: 4.5 };

export const newChampId = () =>
  `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
