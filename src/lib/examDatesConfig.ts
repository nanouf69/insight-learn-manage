/**
 * Source unique de vérité pour toutes les dates d'examen et de formation.
 * Modifier ce fichier met à jour TOUTE l'application.
 */

// ── Dates d'examen théorique 2026 ──
export const ALL_DATES_EXAMEN_THEORIQUE = [
  { date: "27 janvier 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
  { date: "31 mars 2026", lieu: "Puy-de-Dôme – Polydome, Clermont-Ferrand", horaire: "après-midi" },
  { date: "26 mai 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
  { date: "21 juillet 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
  { date: "29 septembre 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
  { date: "17 novembre 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
];

// Version courte (sans adresse complète) pour les vues compactes
export const ALL_DATES_EXAMEN_THEORIQUE_SHORT = ALL_DATES_EXAMEN_THEORIQUE.map(d => ({
  ...d,
  lieu: d.lieu.includes("Villeurbanne") ? "Villeurbanne – Double Mixte" : d.lieu.includes("Clermont-Ferrand") ? "Clermont-Ferrand – Polydome" : d.lieu,
}));

// Version pour les selects onboarding (value/label/lieu)
export const ALL_DATES_EXAMEN_THEORIQUE_VALUES = ALL_DATES_EXAMEN_THEORIQUE.map(d => ({
  value: d.date,
  label: `${d.date} (${d.horaire})`,
  lieu: d.lieu,
}));

// Version pour Step5 onboarding (id/date/label/location)
export const ALL_DATES_EXAMEN_STEP5 = [
  { id: '2026-01-27-pm', date: new Date(2026, 0, 27, 14, 0), label: '27 janvier 2026 (après-midi)', location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne' },
  { id: '2026-03-31-pm', date: new Date(2026, 2, 31, 14, 0), label: '31 mars 2026 (après-midi)', location: 'Puy-de-Dôme – Polydome, Clermont-Ferrand' },
  { id: '2026-05-26-pm', date: new Date(2026, 4, 26, 14, 0), label: '26 mai 2026 (après-midi)', location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne' },
  { id: '2026-07-21-pm', date: new Date(2026, 6, 21, 14, 0), label: '21 juillet 2026 (après-midi)', location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne' },
  { id: '2026-09-29-pm', date: new Date(2026, 8, 29, 14, 0), label: '29 septembre 2026 (après-midi)', location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne' },
  { id: '2026-11-17-pm', date: new Date(2026, 10, 17, 14, 0), label: '17 novembre 2026 (après-midi)', location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne' },
];

// Version ExamenReussitePage (avec pratiqueIndex)
export const ALL_DATES_EXAMEN_REUSSITE = [
  { date: "27 janvier 2026", lieu: "Villeurbanne", pratiqueIndex: 0 },
  { date: "31 mars 2026", lieu: "Clermont-Ferrand", pratiqueIndex: 1 },
  { date: "26 mai 2026", lieu: "Villeurbanne", pratiqueIndex: 2 },
  { date: "21 juillet 2026", lieu: "Villeurbanne", pratiqueIndex: 3 },
  { date: "29 septembre 2026", lieu: "Villeurbanne", pratiqueIndex: 4 },
  { date: "17 novembre 2026", lieu: "Villeurbanne", pratiqueIndex: 5 },
];

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
  "Debut janvier 2027",
];

// ── Dates de formation du catalogue ──
export const ALL_DATES_FORMATION_CATALOGUE = [
  "Du 27 au 30 janvier 2026",
  "Du 31 mars au 3 avril 2026",
  "Du 26 au 29 mai 2026",
  "Du 21 au 24 juillet 2026",
  "Du 29 septembre au 2 octobre 2026",
  "Du 17 au 20 novembre 2026",
];

