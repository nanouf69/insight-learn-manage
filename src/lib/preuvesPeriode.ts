export type Granularite = "jour" | "mois" | "annee";
export interface Bornes { debut: string; fin: string }

/** Bornes inclusives (YYYY-MM-DD) d'un jour, mois (YYYY-MM) ou année (YYYY). */
export function bornesPeriode(g: Granularite, v: string): Bornes {
  if (g === "jour") return { debut: v, fin: v };
  if (g === "mois") {
    const [y, m] = v.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { debut: `${v}-01`, fin: `${v}-${String(last).padStart(2, "0")}` };
  }
  return { debut: `${v}-01-01`, fin: `${v}-12-31` };
}

/** Une formation sans date de début est exclue ; sans fin, on considère le seul jour de début. */
export function formationChevauche(debut: string | null | undefined, fin: string | null | undefined, b: Bornes): boolean {
  if (!debut) return false;
  const d = debut.slice(0, 10);
  const f = (fin || debut).slice(0, 10);
  return d <= b.fin && f >= b.debut;
}
