/** Information prospective uniquement : aucun paiement ni document historique n'est recalculé. */
export const FRAIS_EXAMEN_CMA_INFORMATION = "Examen complet CMA TAXI/VTC : 241 € en 2026 ; 246 € à partir du 1er janvier 2027. Les tarifs de repassage et de mobilité professionnelle sont distincts.";

export function fraisExamenCma(date?: string | Date | null): number {
  if (date instanceof Date) {
    if (!Number.isFinite(date.getTime())) return 241;
    const paris = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    return Number(paris.slice(0, 4)) >= 2027 ? 246 : 241;
  }
  // Dates de session ISO ou libellés français ; aucune prochaine date devinée.
  const year = date?.match(/\b(20\d{2})\b/)?.[1];
  return year && Number(year) >= 2027 ? 246 : 241;
}