// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ALL_DATES_EXAMEN_REUSSITE, ALL_DATES_EXAMEN_THEORIQUE } from '@/lib/examDatesConfig';

const page = readFileSync('src/components/examens/ExamenReussitePage.tsx', 'utf8');

describe('Sélection des sessions d’examen', () => {
  it('les deux sélecteurs utilisent la même session et le même changement', () => {
    expect(page.match(/<Select value=\{selectedExamDate\} onValueChange=\{handleExamDateChange\}>/g)).toHaveLength(2);
    expect(page.match(/\{datesExamenTheorique\.map\(e => \(/g)).toHaveLength(2);
    expect(page).toContain('aria-label="Session d’examen"');
  });

  it('ne limite plus le choix aux inscriptions de la session courante', () => {
    expect(page).not.toContain('filterDateExamen');
    expect(page).not.toContain('datesExamenDisponibles');
    expect(page).not.toContain('Toutes les dates');
    expect(page).toContain("queryKey: ['apprenants-examen', selectedExamDate]");
    expect(page).toContain(".ilike('date_examen_theorique', `%${selectedExamDate}%`)");
  });

  it('conserve toutes les sessions anciennes et futures sans doublon', () => {
    const history = [...page.matchAll(/\{ date: "([^"]+)", lieu: "[^\"]+\(passé\)"/g)].map(m => m[1]);
    const offered = [...history, ...ALL_DATES_EXAMEN_REUSSITE.map(e => e.date)];
    expect(offered).toEqual(ALL_DATES_EXAMEN_THEORIQUE.map(e => e.date));
    expect(new Set(offered).size).toBe(offered.length);
  });

  it('réinitialise seulement les filtres et non la session sélectionnée', () => {
    const reset = page.match(/const resetFilters = \(\) => \{([^}]+)\}/)?.[1];
    expect(reset).toContain('setFilterStatut');
    expect(reset).toContain('setFilterIdentifiants');
    expect(reset).toContain('setFilterModalite');
    expect(reset).not.toContain('setSelectedExamDate');
  });
});