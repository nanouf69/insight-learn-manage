/** Candidate read model only: never imported by the live presence calculators. */
export interface IntervallePresenceExacte { date: string; debut: number; fin: number }
export interface RecuPresenceExacte extends IntervallePresenceExacte { id: string; rapprochements: readonly { id: string }[] }
export function projeterMinutesPresenceExacte(signatures: readonly IntervallePresenceExacte[], recus: readonly RecuPresenceExacte[]) {
  const dates = new Map<string, IntervallePresenceExacte[]>();
  for (const r of [...signatures, ...recus]) {
    if (!Number.isInteger(r.debut) || !Number.isInteger(r.fin) || r.debut < 0 || r.fin > 1440 || r.fin <= r.debut) throw new Error('Horaires exacts requis');
    dates.set(r.date, [...(dates.get(r.date) ?? []), r]);
  }
  let minutes = 0;
  for (const rows of dates.values()) {
    let debut = -1, fin = -1;
    for (const r of rows.sort((a,b) => a.debut-b.debut)) {
      if (r.debut > fin) { if (fin >= 0) minutes += fin-debut; debut=r.debut; fin=r.fin; }
      else fin=Math.max(fin,r.fin);
    }
    if (fin >= 0) minutes += fin-debut;
  }
  return { minutes, remplacees: new Set(recus.flatMap(r => r.rapprochements.map(x => x.id))) };
}