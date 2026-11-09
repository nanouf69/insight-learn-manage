/** Conservative local suggestion, never a grade or a legal interpretation. */
export type Prenote = {
  note: number | null;
  motif: string;
  regle: string;
  /**
   * true only when the student answer is literally identical to the frozen key
   * after a conservative normalisation that keeps signs, digits, units,
   * currency, percentages and negations. Every other case needs a human save.
   */
  autoValidable: boolean;
};

/**
 * Conservative normalisation: case, Unicode form, typographic apostrophes /
 * dashes / spaces and a trailing full stop only. Signs (−/+), digits, decimal
 * separators, %, €, units, accents and words such as « pas » / « non » are kept,
 * so « −10 euros » ≠ « 10 euros » and « 10 % » ≠ « 10 € ».
 */
export function normaliserConservateur(s: string): string {
  return String(s ?? '')
    .normalize('NFC')
    .toLocaleLowerCase('fr-FR')
    .replace(/[\u2018\u2019\u02BC\u2032`]/g, "'")
    .replace(/[\u2212\u2010\u2011\u2012\u2013\u2014\uFE63\uFF0D]/g, '-')
    .replace(/[\u00A0\u202F\u2007\u2009\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*\.+$/, '')
    .trim();
}

/** Aggressive form, used ONLY to recognise the B2 wording (never for auto-validation). */
const normaliserB2 = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function proposerPrenote(reponse: string, officiel: string, bareme: number | null): Prenote {
  const attente = (motif: string): Prenote => ({ note: null, motif, regle: 'revue-humaine-v2', autoValidable: false });
  if (bareme == null || !Number.isFinite(bareme) || bareme <= 0 || bareme % 0.5 !== 0) return attente('Barème absent ou non exploitable.');
  const r = normaliserConservateur(reponse), o = normaliserConservateur(officiel);
  if (!r || !o) return attente('Réponse ou corrigé absent : aucune note proposée.');
  if (r === o) {
    return { note: bareme, motif: 'Texte littéralement identique au corrigé figé (normalisation conservatrice).', regle: 'identique-conservateur-v2', autoValidable: true };
  }
  // Explicit B2 equivalence: preselection only, never saved without a human click.
  const rawR = String(reponse ?? ''), rawO = String(officiel ?? '');
  const signesOuNegation = /[-−+%€$]|\bne\b|\bpas\b|\bnon\b|\bsans\b|\bjamais\b/i;
  const b2 = /^(?:c est (?:avoir |d avoir )?|avoir |un |le |mon |son )*(?:casier judiciaire (?:b2 vierge|vierge b2)|casier judiciaire vierge \(b2\))$/;
  if (!signesOuNegation.test(rawR) && b2.test(normaliserB2(rawR)) && b2.test(normaliserB2(rawO))) {
    return { note: bareme, motif: 'Même notion : casier judiciaire B2 vierge. Présélection : enregistrement par le formateur requis.', regle: 'equivalence-b2-vierge-v2', autoValidable: false };
  }
  return attente('Réponse différente du corrigé : à apprécier par le formateur.');
}

export function tracePrenote(p: Prenote, noteValidee: number, bareme: number): string {
  return `[PRÉ-NOTE ${p.regle}] Proposition ${p.note ?? 'incertaine'}/${bareme} ; validation humaine ${noteValidee}/${bareme}. ${p.motif}`;
}
