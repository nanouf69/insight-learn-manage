/**
 * Parse a YYYY-MM-DD date string safely without timezone shift.
 * Always returns noon local time to avoid day-boundary issues.
 */
export function safeDateParse(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Format a YYYY-MM-DD string to French locale with weekday.
 * e.g. "mardi 17 février 2026"
 */
export function formatDateFR(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const defaults: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  return safeDateParse(dateStr).toLocaleDateString('fr-FR', options || defaults);
}

/**
 * Short French date format: "mar. 17 févr."
 */
export function formatDateShortFR(dateStr: string): string {
  return safeDateParse(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
