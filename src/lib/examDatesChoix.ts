import { ALL_DATES_EXAMEN_REUSSITE, ALL_DATES_EXAMEN_THEORIQUE } from './examDatesConfig';

export function jourParis(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function datesExamenChoisissables(now = new Date()) {
  const today = jourParis(now);
  const future = new Set(ALL_DATES_EXAMEN_THEORIQUE.filter(d => d.iso >= today).map(d => d.date));
  return ALL_DATES_EXAMEN_REUSSITE.filter(d => future.has(d.date));
}

/** Results screen only: never changes the future-only enrollment selector. */
export function derniereSessionExamenPassee(now = new Date()) {
  const today = jourParis(now);
  return ALL_DATES_EXAMEN_THEORIQUE.filter(d => d.iso < today)
    .sort((a, b) => b.iso.localeCompare(a.iso))[0] ?? null;
}

export function datesExamenResultatsChoisissables(now = new Date()) {
  const last = derniereSessionExamenPassee(now);
  const dates = datesExamenChoisissables(now);
  if (!last) return dates;
  const option = ALL_DATES_EXAMEN_REUSSITE.find(d => d.date === last.date)
    ?? { date: last.date, lieu: last.lieu, pratiqueIndex: -1, dateLimite: last.dateLimite, dateLimiteLibelle: last.dateLimiteLibelle };
  return [option, ...dates];
}