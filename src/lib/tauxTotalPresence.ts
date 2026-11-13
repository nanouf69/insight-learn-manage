export interface PresenceHeuresTotal {
  session: { faites: number; prevues: number };
  pratique: { faites: number; prevues: number };
}

/** Initial VTC presential course only; FC, e-learning and practice-only stay separate. */
export function estVtcPresentiel(row: { type_apprenant?: unknown; formation_choisie?: unknown } | null | undefined) {
  const type = String(row?.type_apprenant || row?.formation_choisie || '').trim().toLowerCase();
  return ['vtc', 'vtc-cours-du-soir', 'vtc-e-presentiel'].includes(type);
}

/** Expected practice is an obligation, not proof that it has been performed. */
export function pratiquePrevueVtc(theoriePrevue: number, pratiqueInscrite: number, vtcPresentiel: boolean) {
  return vtcPresentiel && theoriePrevue > 0 ? Math.max(6, pratiqueInscrite) : pratiqueInscrite;
}

/** Live display only: targets come from the shared course/enrollment projection. */
export function tauxTotalPresence(d: PresenceHeuresTotal | null, pratiquePrevue = 0) {
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