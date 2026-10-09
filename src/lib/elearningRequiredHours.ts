/** Existing learner-path requirements, shared by read-only rate displays. */
export const HEURES_REQUISES: Record<string, number> = {
  "vtc-e": 60,
  "taxi-e": 90,
  "continue-vtc": 14,
  "ta-e": 35,
  "va-e": 7,
};

export function requiredElearningHours(row: {
  heures_elearning?: unknown;
  heures_totales?: unknown;
  heures_presentiel?: unknown;
  type_apprenant?: string | null;
  formation_choisie?: string | null;
}): number {
  const explicit = Number(row.heures_elearning);
  if (explicit > 0) return explicit;
  const fromTotal = Math.max(0, (Number(row.heures_totales) || 0) - (Number(row.heures_presentiel) || 0));
  if (fromTotal > 0) return fromTotal;
  const type = (row.type_apprenant ?? "").trim().toLowerCase();
  const formation = (row.formation_choisie ?? "").trim().toLowerCase();
  const aliases: Record<string, string> = {
    "formation-continue-vtc": "continue-vtc",
    "vtc-elearning": "vtc-e",
    "taxi-elearning": "taxi-e",
    "passerelle-taxi-elearning": "ta-e",
    "passerelle-vtc-elearning": "va-e",
  };
  return HEURES_REQUISES[type || aliases[formation] || formation] ?? 0;
}

/** Same minute-precision display on learner and administrator screens. */
export function formatLearningHours(hours: number): string {
  const minutes = Math.max(0, Math.round(hours * 60));
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}