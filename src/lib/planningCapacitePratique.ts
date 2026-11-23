/** Keep legacy per-date choices until an administrator explicitly applies a new capacity. */
export function capacitePratique(maximum: number | null | undefined, date?: string, parDate: Record<string, number> = {}): number {
  const value = date ? parDate[date] ?? maximum : maximum;
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 3;
}

export function joursFormationPratique(candidats: number, maximum: number): number {
  return Math.ceil(Math.max(0, candidats) / capacitePratique(maximum));
}

/** Explicit global choice updates capacities only, never candidate bookings or course dates. */
export function appliquerCapacitePratique(maximum: 3 | 4, parDate: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.keys(parDate).map(date => [date, maximum]));
}