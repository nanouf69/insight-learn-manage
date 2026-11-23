/** Keep legacy per-date choices until an administrator explicitly applies a new capacity. */
export function capacitePratique(maximum: number | null | undefined, date?: string, parDate: Record<string, number> = {}): number {
  const value = date ? parDate[date] ?? maximum : maximum;
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 3;
}

export function joursFormationPratique(candidats: number, maximum: number): number {
  return Math.ceil(Math.max(0, candidats) / capacitePratique(maximum));
}

/** Display-only comparison: free days belong to neither track. */
export function ecartsJoursPratique(types: Array<'vtc' | 'taxi' | 'libre'>, besoinVtc: number, besoinTaxi: number) {
  const vtc = types.filter(type => type === 'vtc').length;
  const taxi = types.filter(type => type === 'taxi').length;
  return { vtc, taxi, libres: types.filter(type => type === 'libre').length, ecartVtc: vtc - besoinVtc, ecartTaxi: taxi - besoinTaxi };
}

/** Explicit global choice updates capacities only, never candidate bookings or course dates. */
export function appliquerCapacitePratique(maximum: 3 | 4, parDate: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.keys(parDate).map(date => [date, maximum]));
}

/** Number only effective planning dates, independently for each track. */
export function numerosJoursPratique(typesParDate: Record<string, 'vtc' | 'taxi' | 'libre'>): Record<string, number> {
  const compte = { vtc: 0, taxi: 0 };
  const numeros: Record<string, number> = {};
  for (const date of Object.keys(typesParDate).sort()) {
    const type = typesParDate[date];
    if (type === 'vtc' || type === 'taxi') numeros[date] = ++compte[type];
  }
  return numeros;
}