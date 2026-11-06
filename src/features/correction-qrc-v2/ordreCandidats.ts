import type { TentativeReelle } from "./noyauReel";

const instant = (v?: string | null): number | null => {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
};

/**
 * Ordre d'affichage admin uniquement (aucune donnée modifiée) :
 * 1) matière terminée avec fin serveur → fin croissante (premier fini en haut) ;
 * 2) terminée sans horodatage de fin fiable → début croissant (aucune fin inventée) ;
 * 3) non terminée → début croissant.
 * Ex aequo départagés par début puis identifiant : ordre stable et déterministe.
 */
export function ordonnerCandidatsParFin<T extends Pick<TentativeReelle, "attempt_id" | "etat" | "started_at" | "finished_at">>(tentatives: readonly T[]): T[] {
  const groupe = (t: T) => (t.etat === "terminee" ? (instant(t.finished_at) !== null ? 0 : 1) : 2);
  return tentatives
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      const ga = groupe(a.t), gb = groupe(b.t);
      if (ga !== gb) return ga - gb;
      if (ga === 0) {
        const d = (instant(a.t.finished_at) as number) - (instant(b.t.finished_at) as number);
        if (d !== 0) return d;
      }
      const sa = instant(a.t.started_at), sb = instant(b.t.started_at);
      if (sa !== sb) {
        if (sa === null) return 1;
        if (sb === null) return -1;
        return sa - sb;
      }
      return a.i - b.i;
    })
    .map((x) => x.t);
}
