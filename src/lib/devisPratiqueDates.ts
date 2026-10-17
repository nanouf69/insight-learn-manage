import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export type DevisPratiquePlanning = {
  day_time_slots: unknown;
  excluded_days: string[] | null;
};

/** Only explicitly assigned days are authoritative; legacy period labels are not. */
export function devisPratiqueDates(rows: DevisPratiquePlanning[], filiere: 'taxi' | 'vtc'): string[] {
  const dates = new Set<string>();
  for (const row of rows) {
    if (!row.day_time_slots || typeof row.day_time_slots !== 'object' || Array.isArray(row.day_time_slots)) continue;
    for (const [day, slot] of Object.entries(row.day_time_slots)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || row.excluded_days?.includes(day)) continue;
      if (!slot || typeof slot !== 'object' || Array.isArray(slot) || !('type' in slot)) continue;
      if (String(slot.type).toLowerCase() !== filiere) continue;
      const parsed = new Date(`${day}T12:00:00`);
      if (Number.isNaN(parsed.getTime()) || format(parsed, 'yyyy-MM-dd') !== day) continue;
      dates.add(day);
    }
  }
  return [...dates].sort().map(day => format(new Date(`${day}T12:00:00`), 'd MMMM yyyy', { locale: fr }));
}