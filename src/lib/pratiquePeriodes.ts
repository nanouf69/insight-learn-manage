/**
 * Calcule automatiquement, à partir de la date de fin de formation théorique :
 *  - la période d'examen pratique = la 1re session d'examen pratique qui commence après la formation
 *  - la période d'entraînement pratique = les 3 semaines qui précèdent l'examen pratique
 *    (de J-21 à J-3 par rapport au 1er jour d'examen pratique)
 *
 * Exemple : formation du 14 au 27 septembre 2026
 *   → examen pratique "Du 2 au 13 novembre 2026"
 *   → entraînement pratique "du 12 au 30 octobre 2026"
 */
import { ALL_DATES_EXAMEN_PRATIQUE } from "@/lib/examDatesConfig";

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const moisIndex = (m: string): number =>
  MOIS.findIndex((x) => x === m.toLowerCase().replace("fevrier", "février").replace("aout", "août").replace("decembre", "décembre"));

const toDay = (s: string): number => parseInt(s.replace(/er$/i, ""), 10);

export interface PratiquePeriode {
  /** Libellé d'origine du catalogue, ex: "Du 2 au 13 novembre 2026" */
  label: string;
  debut: Date;
  fin: Date;
}

/** Parse "Du 2 au 13 novembre 2026" ou "Du 29 juin au 7 juillet 2026" ou "Du 1er au 11 septembre 2026" */
export function parsePeriodePratique(label: string): PratiquePeriode | null {
  const diff = label.match(/du\s+(\d{1,2}(?:er)?)\s+([a-zéûôà]+)\s+au\s+(\d{1,2}(?:er)?)\s+([a-zéûôà]+)\s+(\d{4})/i);
  if (diff) {
    const [, jd, md, jf, mf, an] = diff;
    const mi = moisIndex(md), mf2 = moisIndex(mf);
    if (mi >= 0 && mf2 >= 0) {
      const year = parseInt(an, 10);
      const debut = new Date(mf2 < mi ? year - 1 : year, mi, toDay(jd));
      return { label, debut, fin: new Date(year, mf2, toDay(jf)) };
    }
  }
  const same = label.match(/du\s+(\d{1,2}(?:er)?)\s+au\s+(\d{1,2}(?:er)?)\s+([a-zéûôà]+)\s+(\d{4})/i);
  if (same) {
    const [, jd, jf, m, an] = same;
    const mi = moisIndex(m);
    if (mi >= 0) {
      const year = parseInt(an, 10);
      return { label, debut: new Date(year, mi, toDay(jd)), fin: new Date(year, mi, toDay(jf)) };
    }
  }
  return null;
}

const parsedPeriodes = (): PratiquePeriode[] =>
  ALL_DATES_EXAMEN_PRATIQUE
    .map(parsePeriodePratique)
    .filter((p): p is PratiquePeriode => !!p)
    .sort((a, b) => a.debut.getTime() - b.debut.getTime());

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(`${value.slice(0, 10)}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

const formatJourMois = (d: Date, withYear = true): string =>
  `${d.getDate()} ${MOIS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;

/** "du 12 au 30 octobre 2026" (mois fusionné si identique) */
export function formatPeriodeFr(debut: Date, fin: Date): string {
  if (debut.getMonth() === fin.getMonth() && debut.getFullYear() === fin.getFullYear()) {
    return `du ${debut.getDate()} au ${formatJourMois(fin)}`;
  }
  return `du ${formatJourMois(debut, debut.getFullYear() !== fin.getFullYear())} au ${formatJourMois(fin)}`;
}

export interface PratiqueDatesResult {
  /** ex: "du 2 au 13 novembre 2026" */
  examenPratique: string | null;
  /** ex: "du 12 au 30 octobre 2026" */
  entrainementPratique: string | null;
  periode: PratiquePeriode | null;
  entrainementDebut: Date | null;
  entrainementFin: Date | null;
}

/**
 * Retourne la période d'examen pratique qui suit immédiatement la fin de formation,
 * ainsi que la fenêtre d'entraînement pratique (3 semaines avant).
 */
export function getPratiqueDatesForFormation(
  dateFinFormation: string | Date | null | undefined
): PratiqueDatesResult {
  const empty: PratiqueDatesResult = {
    examenPratique: null, entrainementPratique: null,
    periode: null, entrainementDebut: null, entrainementFin: null,
  };
  const fin = toDate(dateFinFormation);
  if (!fin) return empty;

  const periode = parsedPeriodes().find((p) => p.debut.getTime() > fin.getTime());
  if (!periode) return empty;

  const entrainementDebut = new Date(periode.debut);
  entrainementDebut.setDate(entrainementDebut.getDate() - 21);
  const entrainementFin = new Date(periode.debut);
  entrainementFin.setDate(entrainementFin.getDate() - 3);

  return {
    examenPratique: formatPeriodeFr(periode.debut, periode.fin),
    entrainementPratique: formatPeriodeFr(entrainementDebut, entrainementFin),
    periode,
    entrainementDebut,
    entrainementFin,
  };
}
