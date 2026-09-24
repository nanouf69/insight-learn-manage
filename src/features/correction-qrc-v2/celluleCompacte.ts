/** Affichage compact d'une cellule de la matrice Correction QRC (présentation seule, aucune règle). */
export type OrigineCorrection = "humaine" | "automatique" | "ia" | "inconnue" | string;

export interface CelluleEntree {
  corrigee: boolean;
  origine: OrigineCorrection;
  note: number | string | null;
  points: number | null;
  vide: boolean;
  /** Vérification demandée par l'élève (QRC prioritaire). */
  verificationDemandee?: boolean;
}

export interface CelluleSortie {
  couleur: "vert" | "orange" | "gris" | "rouge" | "bareme" | "violet";
  libelle: string;
  detail: string;
}

const fr = (v: number | string | null) => String(v ?? 0).replace(".", ",");

export function celluleCompacte(c: CelluleEntree): CelluleSortie {
  const note = `${fr(c.note)}${c.points != null ? `/${c.points}` : ""}`;
  if (c.corrigee) {
    if (c.origine === "humaine") return { couleur: "vert", libelle: `✓ ${note}`, detail: `Correction humaine vérifiée — ${note}` };
    if (c.origine === "ia") {
      return c.verificationDemandee
        ? { couleur: "violet", libelle: `⚠️🤖 ${note}`, detail: `⚠️ Vérification demandée par l'élève — Correction IA — Gemini 3.8 Flash (non vérifiée) — ${note}` }
        : { couleur: "violet", libelle: `🤖 ${note}`, detail: `Correction IA — Gemini 3.8 Flash (non vérifiée par un formateur) — ${note}` };
    }
    if (c.origine === "automatique") return { couleur: "orange", libelle: `≈ ${note}`, detail: `Correction automatique historique (non validée par un formateur) — ${note}` };
    return { couleur: "gris", libelle: `? ${note}`, detail: `Origine de la correction à vérifier — ${note}` };
  }
  if (c.points == null) return { couleur: "bareme", libelle: "⚠ barème", detail: "Barème absent" };
  return {
    couleur: "rouge",
    libelle: c.vide ? `À corr. ∅/${c.points}` : `À corr. /${c.points}`,
    detail: `À corriger (/${c.points})${c.vide ? " — copie vide" : ""}`,
  };
}

/** Largeurs de la matrice : colonnes fixes compactes + QRC réparties sur la largeur restante. */
export const LARGEURS_MATRICE = { candidat: 10, passage: 5.5, note: 6.5, qrcMin: 4.25 } as const;
export const largeurMinimaleMatrice = (nbQrc: number) =>
  LARGEURS_MATRICE.candidat + LARGEURS_MATRICE.passage + LARGEURS_MATRICE.note + nbQrc * LARGEURS_MATRICE.qrcMin;
