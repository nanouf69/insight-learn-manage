import type { SignatureManquante } from '@/lib/signaturesManquantes';
/** Only the exact recorded time range is converted, never a duration guessed from the label. */
export function minutesHorairePresence(horaire?: string): number | null {
  const m = /^(\d{1,2})[h:](\d{2})?\s*[-–]\s*(\d{1,2})[h:](\d{2})?$/.exec(horaire?.trim() ?? '');
  if (!m) return null;
  const a = Number(m[1]) * 60 + Number(m[2] ?? 0), b = Number(m[3]) * 60 + Number(m[4] ?? 0);
  if (Number(m[1]) > 23 || Number(m[3]) > 23 || Number(m[2] ?? 0) > 59 || Number(m[4] ?? 0) > 59 || b <= a) return null;
  return b - a;
}
export function heuresRestantSigner(rows: readonly SignatureManquante[], dateReference: string) {
  const byKey = new Map<string, SignatureManquante>();
  let conflit = false;
  for (const r of rows) {
    if (r.date > dateReference || r.etat !== 'manquante') continue;
    const key = `${r.date}|${r.creneau}`;
    const prev = byKey.get(key);
    if (prev && prev.horaires !== r.horaires) conflit = true;
    else byKey.set(key, r);
  }
  const details = [...byKey.values()].map(r => ({ ...r, minutes: minutesHorairePresence(r.horaires) }));
  const inconnues = details.filter(r => r.minutes === null).length;
  const minutes = details.reduce((s, r) => s + (r.minutes ?? 0), 0);
  // Date-only admin declarations never remove unsigned slots or prove exact slot attendance.
  return { details, minutes: conflit || inconnues ? null : minutes, minutesAJustifier: conflit || inconnues ? null : minutes, inconnues, conflit };
}
export const formatMinutesPresence = (minutes: number) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;