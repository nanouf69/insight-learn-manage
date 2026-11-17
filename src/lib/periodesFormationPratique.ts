import { ALL_DATES_EXAMEN_THEORIQUE, ALL_DATES_EXAMEN_PRATIQUE_NO_ACCENT } from './examDatesConfig';

const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
function iso(jour: string, mois: string, annee: string): string | null {
  const index = MOIS.indexOf(mois);
  if (index < 0) return null;
  const value = `${annee}-${String(index + 1).padStart(2, '0')}-${jour.padStart(2, '0')}`;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}
export function debutPeriodeExamenPratique(label: string): string | null {
  const text = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const full = text.match(/^du\s+(\d+)(?:er)?\s+([a-z]+)\s+au\s+\d+(?:er)?\s+[a-z]+\s+(\d{4})$/);
  if (full) return iso(full[1], full[2], full[3]);
  const same = text.match(/^du\s+(\d+)(?:er)?\s+au\s+\d+(?:er)?\s+([a-z]+)\s+(\d{4})$/);
  return same ? iso(same[1], same[2], same[3]) : null;
}
function decaler(date: string, jours: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + jours);
  return value.toISOString().slice(0, 10);
}
export interface PeriodeFormationPratique {
  examenTheorique: string; examenPratique: string; debut: string; fin: string;
}
/** Exact dates only: an imprecise CMA label never manufactures a training deadline. */
export function periodesFormationPratique(): PeriodeFormationPratique[] {
  const pratiques = ALL_DATES_EXAMEN_PRATIQUE_NO_ACCENT.flatMap(label => {
    const debut = debutPeriodeExamenPratique(label);
    return debut ? [{ label, debut }] : [];
  }).sort((a, b) => a.debut.localeCompare(b.debut));
  return ALL_DATES_EXAMEN_THEORIQUE.flatMap(examen => {
    const pratique = pratiques.find(p => p.debut > examen.iso);
    if (!pratique) return [];
    const debut = decaler(examen.iso, 1);
    const fin = decaler(pratique.debut, -1);
    return debut <= fin ? [{ examenTheorique: examen.date, examenPratique: pratique.label, debut, fin }] : [];
  });
}