/**
 * Heure légale du centre (Europe/Paris), indépendante du fuseau de l'appareil.
 * Les créneaux d'émargement sont définis en heure de Paris : un appareil réglé
 * sur un autre fuseau ne doit ni avancer ni retarder l'ouverture d'une feuille.
 */
const FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export interface MaintenantParis { dateISO: string; minutes: number }

export function maintenantParis(now: Date = new Date()): MaintenantParis {
  const p: Record<string, string> = {};
  for (const x of FMT.formatToParts(now)) p[x.type] = x.value;
  const h = Number(p.hour) % 24;
  return { dateISO: `${p.year}-${p.month}-${p.day}`, minutes: h * 60 + Number(p.minute) };
}
