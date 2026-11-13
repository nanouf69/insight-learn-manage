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
  const sessionMinutes=Math.max(0,Math.round(d.session.faites*60));
  const pratiqueMinutes=Math.max(0,Math.round(d.pratique.faites*60));
  const faites = (sessionMinutes+pratiqueMinutes)/60;
  const acquises = Math.min(sessionMinutes, Math.round(sessionPrevues*60)) + Math.min(pratiqueMinutes, Math.round(pratiquePrevues*60));
  return { faites, prevues, pratiquePrevues, pct: Math.min(100, acquises / Math.round(prevues*60) * 100) };
}