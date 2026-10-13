/**
 * Identifiant de tentative d'une révision « Refaire les fausses ».
 *
 * Une révision terminée (completed = true) est figée : le serveur refuse
 * toute réécriture élève (RLS). Une nouvelle révision du même examen reçoit
 * donc son PROPRE identifiant (`revision_fausses_EB1__r2`, `__r3`…) au lieu
 * de réécrire la ligne terminée. Lecture seule : ne modifie aucune ligne.
 */
export interface RevisionRowLike {
  exercice_id: string;
  completed: boolean | null;
}

export const revisionBaseId = (examenId: string | null | undefined) =>
  `revision_fausses_${examenId || "unknown"}`;

const roundOf = (base: string, id: string): number | null => {
  if (id === base) return 1;
  const m = id.startsWith(`${base}__r`) ? id.slice(base.length + 3) : null;
  if (!m || !/^\d+$/.test(m)) return null;
  return Number(m);
};

/** Choisit la tentative à reprendre (non terminée) ou la prochaine tentative libre. */
export function choisirTentativeRevision(base: string, rows: RevisionRowLike[]): string {
  const mine = rows
    .map((r) => ({ r, n: roundOf(base, String(r.exercice_id)) }))
    .filter((x): x is { r: RevisionRowLike; n: number } => x.n != null);
  const enCours = mine.filter((x) => x.r.completed !== true).sort((a, b) => b.n - a.n)[0];
  if (enCours) return enCours.r.exercice_id;
  if (mine.length === 0) return base;
  const max = Math.max(...mine.map((x) => x.n));
  return `${base}__r${max + 1}`;
}
