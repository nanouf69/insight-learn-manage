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
 * Uses manual formatting to avoid locale/timezone issues.
 * e.g. "mardi 17 février 2026"
 */
const JOURS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function formatDateFR(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  // If custom options are passed, use Intl (for non-weekday formatting)
  if (options) {
    return safeDateParse(dateStr).toLocaleDateString('fr-FR', options);
  }
  // Default: manual formatting for reliable weekday
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  return `${JOURS_FR[dateObj.getDay()]} ${d} ${MOIS_FR[m - 1]} ${y}`;
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
