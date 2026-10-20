export interface PresenceHeuresTotal {
  session: { faites: number; prevues: number };
  pratique: { faites: number; prevues: number };
}

/** Live display only: recorded hours, signatures and frozen statements stay untouched. */
export function tauxTotalPresence(d: PresenceHeuresTotal | null, pratiquePrevue = 6) {
  if (!d) return null;
  const sessionPrevues = d.session.prevues;
  const pratiquePrevues = d.pratique.prevues > 0 ? d.pratique.prevues : pratiquePrevue;
  const prevues = sessionPrevues + pratiquePrevues;
  if (prevues <= 0) return null;
  // Cap each part separately: extra theory hours never compensate missing practice.
  const faites = d.session.faites + d.pratique.faites;
  const acquises = Math.min(d.session.faites, sessionPrevues) + Math.min(d.pratique.faites, pratiquePrevues);
  return { faites, prevues, pratiquePrevues, pct: Math.min(100, acquises / prevues * 100) };
}