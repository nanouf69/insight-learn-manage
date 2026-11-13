/** Server time only. A client timestamp must never authorize a learner signature. */
export const parisToday = (now = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export function dateSignatureAutorisee(date: unknown, now = new Date()): boolean {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  // The real slot opening remains an independent server check.
  return date >= parisToday(now);
}

export const SIGNATURE_PASSEE_REFUSEE = 'Une date passée ne peut plus être signée par un apprenant. Contactez le centre pour une gestion administrative justifiée de présence ou d’absence, distincte d’une signature.';