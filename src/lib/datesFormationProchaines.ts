export function datesFormationProchaines(dates: string[], now = new Date()): string[] {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return [...new Set(dates)].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today).sort();
}