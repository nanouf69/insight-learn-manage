/**
 * Jours de formation pratique : le temps de connexion e-learning passé pendant
 * les créneaux pratique (9h-12h et 13h-16h, heure de Paris) n'est pas compté —
 * l'élève est en formation pratique. Après 16h (et entre 12h et 13h) le temps
 * e-learning reste compté normalement. Affichage/calcul seulement : aucune
 * connexion enregistrée n'est modifiée.
 */
import { getSessionEndMs, type SessionLike } from "./session-duration";

export const CRENEAUX_PRATIQUE: Array<[number, number]> = [[9, 12], [13, 16]];

/** ms UTC de `date` (AAAA-MM-JJ) à `heure`:00 heure de Paris (gère l'heure d'été). */
export function parisMs(date: string, heure: number): number {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, heure, 0, 0);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(guess));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asParis = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
  return guess - (asParis - guess);
}

export function fenetresPratique(dates: Iterable<string>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const raw of new Set(Array.from(dates, (d) => String(d || "").slice(0, 10)))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) continue;
    for (const [a, b] of CRENEAUX_PRATIQUE) out.push([parisMs(raw, a), parisMs(raw, b)]);
  }
  return out.sort((x, y) => x[0] - y[0]);
}

/**
 * Découpe chaque connexion pour retirer les parties situées dans un créneau
 * pratique. Les morceaux conservés gardent les champs d'origine ; la fin
 * effective (plafond 7h / inactivité) est calculée avant découpe.
 */
export function retirerCreneauxPratique<T extends SessionLike & { id?: string }>(
  rows: T[],
  datesPratique: Iterable<string>,
): T[] {
  const fen = fenetresPratique(datesPratique);
  if (fen.length === 0) return rows;
  const out: T[] = [];
  for (const r of rows) {
    const s = Date.parse(r.started_at);
    if (!Number.isFinite(s)) { out.push(r); continue; }
    const e = getSessionEndMs(r);
    if (!Number.isFinite(e) || e <= s || !fen.some(([a, b]) => a < e && b > s)) { out.push(r); continue; }
    let cur = s;
    let n = 0;
    const push = (from: number, to: number) => {
      if (to - from < 60000) return;
      const iso = new Date(to).toISOString();
      out.push({ ...r, ...(r.id ? { id: n ? `${r.id}#${n}` : r.id } : {}), started_at: new Date(from).toISOString(), ended_at: iso, last_seen_at: iso, last_action_at: iso });
      n++;
    };
    for (const [a, b] of fen) {
      if (b <= cur || a >= e) continue;
      if (a > cur) push(cur, Math.min(a, e));
      cur = Math.max(cur, b);
      if (cur >= e) break;
    }
    if (cur < e) push(cur, e);
  }
  return out;
}
