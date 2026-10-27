/** Quote display totals, practical training included (never added again).
 * VA = 36 h like TA (30 h theory + 6 h practice), approved 27/10/2026.
 */
export const DEVIS_DUREES_ELEARNING = { vtc: 66, taxi: 96, ta: 36, va: 36 } as const;
export type ParcoursDevisElearning = keyof typeof DEVIS_DUREES_ELEARNING;

export function parcoursDevisElearning(identity: string): ParcoursDevisElearning | null {
  const value = identity.toLowerCase();
  if (!/e[\s_-]?learning/.test(value)) return null;
  if (/^ta[_ -]|\bta\b|taxi pour chauffeur/.test(value)) return 'ta';
  if (/^va[_ -]|\bva\b|vtc pour chauffeur/.test(value)) return 'va';
  if (/taxi/.test(value)) return 'taxi';
  if (/vtc/.test(value)) return 'vtc';
  return null;
}

export function dureeDevisElearning(identity: string): string | undefined {
  const parcours = parcoursDevisElearning(identity);
  const hours = parcours ? DEVIS_DUREES_ELEARNING[parcours] : undefined;
  return hours === undefined ? undefined : `${hours} heures`;
}

/** Exact duration marker on NEW quotes only; historical records stay unchanged. */
export function formationDevisAvecDuree(label: string, identity = label): string {
  const duree = dureeDevisElearning(identity);
  return duree ? `${label} — Durée totale : ${duree}` : label;
}

export function dureeDevisEnregistre(formation: string): string | undefined {
  return formation.match(/ — Durée totale : (\d+ heures)$/)?.[1];
}