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
}): number {
  const explicit = Number(row.heures_elearning);
  if (explicit > 0) return explicit;
  const fromTotal = Math.max(0, (Number(row.heures_totales) || 0) - (Number(row.heures_presentiel) || 0));
  if (fromTotal > 0) return fromTotal;
  return HEURES_REQUISES[(row.type_apprenant ?? "").trim().toLowerCase()] ?? 0;
}