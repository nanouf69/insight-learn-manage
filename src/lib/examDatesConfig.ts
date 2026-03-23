/**
 * Source unique de vérité pour toutes les dates d'examen et de formation.
 * Modifier ce fichier met à jour TOUTE l'application.
 */

// ── Dates d'examen théorique 2026 ──
export const ALL_DATES_EXAMEN_THEORIQUE = [
  { date: "26 mai 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
  { date: "21 juillet 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
  { date: "29 septembre 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
  { date: "17 novembre 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
];

// Version courte (sans adresse complète) pour les vues compactes
export const ALL_DATES_EXAMEN_THEORIQUE_SHORT = ALL_DATES_EXAMEN_THEORIQUE.map(d => ({
  ...d,
  lieu: d.lieu.includes("Villeurbanne") ? "Villeurbanne – Double Mixte" : d.lieu,
}));

// Version pour les selects onboarding (value/label/lieu)
export const ALL_DATES_EXAMEN_THEORIQUE_VALUES = ALL_DATES_EXAMEN_THEORIQUE.map(d => ({
  value: d.date,
  label: `${d.date} (${d.horaire})`,
  lieu: d.lieu,
}));

// Version pour Step5 onboarding (id/date/label/location)
export const ALL_DATES_EXAMEN_STEP5 = [
  { id: '2026-05-26-pm', date: new Date(2026, 4, 26, 14, 0), label: '26 mai 2026 (après-midi)', location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne' },
  { id: '2026-07-21-pm', date: new Date(2026, 6, 21, 14, 0), label: '21 juillet 2026 (après-midi)', location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne' },
  { id: '2026-09-29-pm', date: new Date(2026, 8, 29, 14, 0), label: '29 septembre 2026 (après-midi)', location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne' },
  { id: '2026-11-17-pm', date: new Date(2026, 10, 17, 14, 0), label: '17 novembre 2026 (après-midi)', location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne' },
];

// Version ExamenReussitePage (avec pratiqueIndex)
export const ALL_DATES_EXAMEN_REUSSITE = [
  { date: "26 mai 2026", lieu: "Villeurbanne", pratiqueIndex: 0 },
  { date: "21 juillet 2026", lieu: "Villeurbanne", pratiqueIndex: 1 },
  { date: "29 septembre 2026", lieu: "Villeurbanne", pratiqueIndex: 2 },
  { date: "17 novembre 2026", lieu: "Villeurbanne", pratiqueIndex: 3 },
];

// ── Dates d'examen pratique 2026 ──
export const ALL_DATES_EXAMEN_PRATIQUE = [
  "Du 29 juin au 7 juillet 2026",
  "Du 1er au 11 septembre 2026",
  "Du 2 au 13 novembre 2026",
  "Du 16 au 23 décembre 2026",
  "Début janvier 2027",
];

// Version sans accents pour ExamenReussitePage
export const ALL_DATES_EXAMEN_PRATIQUE_NO_ACCENT = [
  "Du 29 juin au 7 juillet 2026",
  "Du 1er au 11 septembre 2026",
  "Du 2 au 13 novembre 2026",
  "Du 16 au 23 decembre 2026",
  "Debut janvier 2027",
];

// ── Dates de formation du catalogue ──
export const ALL_DATES_FORMATION_CATALOGUE = [
  "Du 26 au 29 mai 2026",
  "Du 21 au 24 juillet 2026",
  "Du 29 septembre au 2 octobre 2026",
  "Du 17 au 20 novembre 2026",
];

// ── Dates de formation continue 2026 ──
export const ALL_DATES_FORMATION_CONTINUE = [
  "26 et 27 mai 2026",
  "23 et 24 juin 2026",
  "21 et 22 juillet 2026",
  "29 et 30 septembre 2026",
  "28 et 29 octobre 2026",
  "17 et 18 novembre 2026",
  "23 et 24 décembre 2026",
];

// ── Dates inscription formation continue (page publique) ──
export const ALL_DATES_INSCRIPTION_CONTINUE = [
  { value: "2026-06-29", label: "29 - 30 juin 2026", fin: "2026-06-30" },
  { value: "2026-09-07", label: "7 - 8 septembre 2026", fin: "2026-09-08" },
  { value: "2026-11-02", label: "2 - 3 novembre 2026", fin: "2026-11-03" },
];
