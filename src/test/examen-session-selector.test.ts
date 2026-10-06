// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ALL_DATES_EXAMEN_REUSSITE, ALL_DATES_EXAMEN_THEORIQUE } from '@/lib/examDatesConfig';

const page = readFileSync('src/components/examens/ExamenReussitePage.tsx', 'utf8');

describe('Sélection des sessions d’examen', () => {
  it('les deux sélecteurs partagent les sessions avec une vue globale limitée au tableau', () => {
    expect(page.match(/<Select value=\{selectedExamDate\} onValueChange=\{handleExamDateChange\}>/g)).toHaveLength(1);
    expect(page).toContain("value={showAllExamDates ? 'all' : selectedExamDate}");
    expect(page).toContain("if (date === 'all') setShowAllExamDates(true)");
    expect(page).toContain('else handleExamDateChange(date)');
    expect(page.match(/\{datesExamenTheorique\.map\(e => \(/g)).toHaveLength(2);
    expect(page).toContain('aria-label="Session d’examen"');
  });

  it('ne limite plus le choix aux inscriptions de la session courante', () => {
    expect(page).not.toContain('filterDateExamen');
    expect(page).not.toContain('datesExamenDisponibles');
    expect(page).toContain('<SelectItem value="all">Toutes les dates</SelectItem>');
    expect(page).toContain("queryKey: ['apprenants-examen', selectedExamDate]");
    expect(page).toContain(".ilike('date_examen_theorique', `%${selectedExamDate}%`)");
  });

  it('lit toutes les inscriptions par pages sans affecter la session du planning', () => {
    expect(page).toContain("enabled: showAllExamDates");
    expect(page).toContain(".not('date_examen_theorique', 'is', null)");
    expect(page).toContain(".neq('date_examen_theorique', '')");
    expect(page).toContain('.range(from, from + pageSize - 1)');
    expect(page).toContain('const tableApprenants = showAllExamDates ? apprenantsToutesDates : apprenants');
    expect(page).toContain('const filtered = tableApprenants?.filter');
    expect(page).toContain('{!showAllExamDates && <span data-testid="date-limite-inscription-crm"');
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