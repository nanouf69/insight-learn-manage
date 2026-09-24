/**
 * Source unique de vérité pour toutes les dates d'examen et de formation.
 * Modifier ce fichier met à jour TOUTE l'application.
 */

// ── Dates d'examen théorique 2026 + 2027 ──
// Source : calendrier publié sur ftransport.fr (section « Dates des examens »).
// Aucune date 2026 n'est supprimée. `dateLimite` = date limite d'inscription publiée
// (null quand la source ne la publie pas : on ne l'invente jamais).
// Note: la date précédente (26 mai 2026) est conservée pour permettre la sélection
// d'apprenants inscrits sur cette session même après son passage.
export interface ExamenTheoriqueDate {
  date: string;
  lieu: string;
  horaire: string;
  /** ISO YYYY-MM-DD de l'examen */
  iso: string;
  /** ISO YYYY-MM-DD de la date limite d'inscription, ou null si non publiée */
  dateLimite: string | null;
  /** Texte exact de la date limite (ex. « 8 janvier 2027 à 12h ») */
  dateLimiteLibelle: string | null;
}

export const ALL_DATES_EXAMEN_THEORIQUE: ExamenTheoriqueDate[] = [
  { date: "27 janvier 2026", iso: "2026-01-27", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi", dateLimite: null, dateLimiteLibelle: null },
  { date: "31 mars 2026", iso: "2026-03-31", lieu: "Puy-de-Dôme – Polydome, Place du 1er Mai, 63000 Clermont-Ferrand", horaire: "après-midi", dateLimite: null, dateLimiteLibelle: null },
  { date: "26 mai 2026", iso: "2026-05-26", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi", dateLimite: "2026-05-06", dateLimiteLibelle: "6 mai 2026" },
  { date: "21 juillet 2026", iso: "2026-07-21", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi", dateLimite: "2026-07-03", dateLimiteLibelle: "3 juillet 2026" },
  { date: "29 septembre 2026", iso: "2026-09-29", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi", dateLimite: "2026-09-11", dateLimiteLibelle: "11 septembre 2026" },
  { date: "17 novembre 2026", iso: "2026-11-17", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi", dateLimite: "2026-10-30", dateLimiteLibelle: "30 octobre 2026" },
  { date: "26 janvier 2027", iso: "2027-01-26", lieu: "Rhône – ParcExpo, 21 Avenue de l'Europe, 69400 Villefranche-sur-Saône", horaire: "", dateLimite: "2027-01-08", dateLimiteLibelle: "8 janvier 2027 à 12h" },
  { date: "30 mars 2027", iso: "2027-03-30", lieu: "Rhône – ParcExpo, 21 Avenue de l'Europe, 69400 Villefranche-sur-Saône", horaire: "", dateLimite: "2027-03-12", dateLimiteLibelle: "12 mars 2027 à 12h" },
  { date: "25 mai 2027", iso: "2027-05-25", lieu: "Puy-de-Dôme – Polydome, Place du 1er mai, 63100 Clermont-Ferrand", horaire: "", dateLimite: "2027-05-07", dateLimiteLibelle: "7 mai 2027 à 12h" },
  { date: "20 juillet 2027", iso: "2027-07-20", lieu: "Rhône – Matmut Stadium, 353 avenue Jean Jaurès, 69100 Villeurbanne", horaire: "", dateLimite: "2027-07-02", dateLimiteLibelle: "2 juillet 2027 à 12h" },
  { date: "28 septembre 2027", iso: "2027-09-28", lieu: "Lieu à confirmer", horaire: "", dateLimite: "2027-09-10", dateLimiteLibelle: "10 septembre 2027 à 12h" },
  { date: "7 décembre 2027", iso: "2027-12-07", lieu: "Rhône – ParcExpo, 21 Avenue de l'Europe, 69400 Villefranche-sur-Saône", horaire: "", dateLimite: "2027-11-19", dateLimiteLibelle: "19 novembre 2027 à 12h" },
];

const deaccentExam = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/**
 * Retrouve l'examen EXACT correspondant à la date enregistrée sur la fiche de l'élève.
 * Accepte « 17 novembre 2026 », « 17 novembre 2026 (après-midi) », « 2026-11-17 » ou « 17/11/2026 ».
 * Retourne null si aucune correspondance certaine (jamais de « prochaine date » devinée).
 */
export function trouverExamenTheorique(valeur: string | null | undefined): ExamenTheoriqueDate | null {
  const v = deaccentExam(String(valeur || ""));
  if (!v) return null;
  const matches = ALL_DATES_EXAMEN_THEORIQUE.filter((e) => {
    const [y, m, d] = e.iso.split("-");
    const txt = new RegExp(`(^|\\D)${deaccentExam(e.date)}($|\\D)`);
    return txt.test(v) || v.includes(e.iso) || new RegExp(`(^|\\D)${d}/${m}/${y}`).test(v);
  });
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Prochaine date d'examen théorique (la plus proche encore à venir).
 * Utilisée par défaut pour toute nouvelle inscription.
 */
export function getProchaineDateExamenTheorique(now: Date = new Date()) {
  const MONTHS: Record<string, number> = {
    janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10,
    décembre: 11, decembre: 11,
  };
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const parsed = ALL_DATES_EXAMEN_THEORIQUE.map((d) => {
    const m = d.date.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
    const dt = m && MONTHS[m[2].toLowerCase()] !== undefined
      ? new Date(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]))
      : null;
    return { ...d, parsedDate: dt };
  }).filter((d) => d.parsedDate && d.parsedDate >= today)
    .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());
  return parsed[0] ?? null;
}

// Version courte (sans adresse complète) pour les vues compactes
export const ALL_DATES_EXAMEN_THEORIQUE_SHORT = ALL_DATES_EXAMEN_THEORIQUE.map(d => ({
  ...d,
  lieu: d.lieu.includes("Double Mixte") ? "Villeurbanne – Double Mixte"
    : d.lieu.includes("Matmut") ? "Villeurbanne – Matmut Stadium"
    : d.lieu.includes("Villefranche") ? "Villefranche-sur-Saône – ParcExpo"
    : d.lieu.includes("Clermont-Ferrand") ? "Clermont-Ferrand – Polydome" : d.lieu,
}));

// Version pour les selects onboarding (value/label/lieu)
export const ALL_DATES_EXAMEN_THEORIQUE_VALUES = ALL_DATES_EXAMEN_THEORIQUE.map(d => ({
  value: d.date,
  label: d.horaire ? `${d.date} (${d.horaire})` : d.date,
  lieu: d.lieu,
}));

// Version pour Step5 onboarding (id/date/label/location)
export const ALL_DATES_EXAMEN_STEP5 = ALL_DATES_EXAMEN_THEORIQUE
  .filter((d) => d.iso >= "2026-07-21")
  .map((d) => {
    const [y, m, j] = d.iso.split("-").map(Number);
    return {
      id: `${d.iso}${d.horaire === "après-midi" ? "-pm" : ""}`,
      date: new Date(y, m - 1, j, 14, 0),
      label: d.horaire ? `${d.date} (${d.horaire})` : d.date,
      location: d.lieu,
    };
  });

// Version ExamenReussitePage (avec pratiqueIndex)
// Dérivée de la source commune (2026 à partir de juillet + 2027) : aucune liste séparée.
// pratiqueIndex : index dans ALL_DATES_EXAMEN_PRATIQUE ; -1 = période pratique non publiée.
const PRATIQUE_INDEX: Record<string, number> = { "2026-07-21": 0, "2026-09-29": 1, "2026-11-17": 2 };
export const ALL_DATES_EXAMEN_REUSSITE = ALL_DATES_EXAMEN_THEORIQUE
  .filter((d) => d.iso >= "2026-07-21")
  .map((d) => ({
    date: d.date,
    lieu: ALL_DATES_EXAMEN_THEORIQUE_SHORT.find((x) => x.iso === d.iso)!.lieu.split(" – ")[0],
    pratiqueIndex: PRATIQUE_INDEX[d.iso] ?? -1,
    dateLimite: d.dateLimite,
    dateLimiteLibelle: d.dateLimiteLibelle,
  }));

// ── Dates d'examen pratique 2026 ──
export const ALL_DATES_EXAMEN_PRATIQUE = [
  "Du 23 février au 6 mars 2026",
  "Du 4 au 13 mai 2026",
  "Du 29 juin au 7 juillet 2026",
  "Du 1er au 11 septembre 2026",
  "Du 2 au 13 novembre 2026",
  "Du 16 au 23 décembre 2026",
  "Début janvier 2027",
];

// Version sans accents pour ExamenReussitePage
export const ALL_DATES_EXAMEN_PRATIQUE_NO_ACCENT = [
  "Du 23 fevrier au 6 mars 2026",
  "Du 4 au 13 mai 2026",
  "Du 29 juin au 7 juillet 2026",
  "Du 1er au 11 septembre 2026",
  "Du 2 au 13 novembre 2026",
  "Du 16 au 23 decembre 2026",
  "Début janvier 2027",
];


// ── Dates de formation du catalogue ──
export const ALL_DATES_FORMATION_CATALOGUE = [
  "Du 21 au 24 juillet 2026",
  "Du 25 au 28 août 2026",
  "Du 29 septembre au 2 octobre 2026",
  "Du 17 au 20 novembre 2026",
];
