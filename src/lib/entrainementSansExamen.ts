export interface ReservationLite { apprenant_id: string; date_choisie: string | null }
export interface Anomalie { id: string; prenom: string; nom: string; dateEntrainement: string; dateExamen: string | null }

/** L'entraînement pratique précède toujours l'examen : signale l'absence d'examen ou un examen antérieur. */
export function anomaliesEntrainementExamen(
  reservations: ReservationLite[],
  apprenants: Array<{ id: string; prenom: string | null; nom: string | null; date_examen_pratique: string | null }>,
  cma: Array<{ apprenant_id: string; date_examen: string }>,
): Anomalie[] {
  const out: Anomalie[] = [];
  for (const a of apprenants) {
    const entr = reservations.filter((r) => r.apprenant_id === a.id && r.date_choisie).map((r) => r.date_choisie!.slice(0, 10)).sort();
    if (!entr.length) continue;
    const exams = [a.date_examen_pratique, ...cma.filter((c) => c.apprenant_id === a.id).map((c) => c.date_examen)]
      .map((d) => String(d ?? "").slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    const premierEntr = entr[0];
    if (exams.some((d) => d >= premierEntr)) continue;
    out.push({ id: a.id, prenom: a.prenom ?? "", nom: a.nom ?? "", dateEntrainement: premierEntr, dateExamen: exams.at(-1) ?? null });
  }
  return out.sort((x, y) => x.dateEntrainement.localeCompare(y.dateEntrainement) || x.nom.localeCompare(y.nom));
}
