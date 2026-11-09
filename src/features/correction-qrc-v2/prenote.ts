/** Conservative local suggestion, never a grade or a legal interpretation. */
export type Prenote = { note: number | null; motif: string; regle: string };
const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function proposerPrenote(reponse: string, officiel: string, bareme: number | null): Prenote {
  const attente = (motif: string): Prenote => ({ note: null, motif, regle: 'revue-humaine-v1' });
  if (bareme == null || !Number.isFinite(bareme) || bareme <= 0 || bareme % 0.5 !== 0) return attente('Barème absent ou non exploitable.');
  const r = normaliser(reponse), o = normaliser(officiel);
  if (!r || !o) return attente('Réponse ou corrigé absent : aucune note proposée.');
  if (r === o) return { note: bareme, motif: 'Texte identique au corrigé figé, après normalisation.', regle: 'exact-normalise-v1' };
  // Only the explicitly requested equivalence; extra claims/negations remain uncertain.
  const b2 = /^(?:c est (?:avoir |d avoir )?|avoir |un |le |mon |son )*(?:casier judiciaire (?:b2 vierge|vierge b2)|casier judiciaire vierge \(b2\))$/;
  if (b2.test(r) && b2.test(o)) return { note: bareme, motif: 'Même notion : casier judiciaire B2 vierge. Validation du formateur requise.', regle: 'equivalence-b2-vierge-v1' };
  return attente('Équivalence ou points partiels non établis : à apprécier par le formateur.');
}

export function tracePrenote(p: Prenote, noteValidee: number, bareme: number): string {
  return `[PRÉ-NOTE ${p.regle}] Proposition ${p.note ?? 'incertaine'}/${bareme} ; validation humaine ${noteValidee}/${bareme}. ${p.motif}`;
}