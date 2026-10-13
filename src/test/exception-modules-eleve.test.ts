import { describe, expect, it } from 'vitest';
import { progressionModulesEleve } from '@/lib/progressionModulesEleve';
import { exceptionModulesEleve, jeuxLyonDispensesParHistorique } from '@/lib/exceptionsModulesEleve';
import { modulesAttribuesDashboard } from '@/lib/parcoursModulesDashboard';

const beneficiary = 'bf12b32a-f8a2-434c-b855-f6033de38c2f';
// Fixture only: no learner writes or network access.
const modules = modulesAttribuesDashboard('vtc-pour-taxi');
const completed = new Set([33,41,3,29,30,38,63,73,8,53]);
describe('Individual display dispensation', () => {
  it('ten proven modules count as 10/10 without fabricated game answers or attendance', () => {
    expect(progressionModulesEleve(modules, id => completed.has(id), new Set(), undefined, beneficiary))
      .toMatchObject({ etat: 'ok', total: 10, termines: 10, restants: [] });
  });
  it('does not exempt other learners or the namesake account', () => {
    for (const id of ['fixture-other', '3e026da8-0fa9-4180-8f15-24aed85ade64', undefined]) {
      expect(exceptionModulesEleve(id)).toBeUndefined();
      expect(progressionModulesEleve(modules, n => completed.has(n), new Set(), undefined, id))
        .toMatchObject({ total: 11, termines: 9 });
    }
  });
  it('does not fabricate a module validation', () => {
    expect(progressionModulesEleve(modules, id => completed.has(id) && id !== 8, new Set(), undefined, beneficiary))
      .toMatchObject({ total: 10, termines: 9, restants: [{ id: 8, raison: 'module' }] });
  });
  it('switching accounts removes the exception immediately', () => {
    const read = (id: string) => progressionModulesEleve(modules, n => completed.has(n), new Set(), undefined, id);
    expect(read(beneficiary)).toMatchObject({ termines: 10 });
    expect(read('fixture-other')).toMatchObject({ termines: 9 });
  });
});

describe('Past completed paths are exempt from the two Lyon games only', () => {
  const path = [{ id: 3, nom: 'Introduction' }, { id: 8, nom: 'Pratique VTC' }];
  const rows = path.map(m => ({ module_id: m.id, status: 'completed', completed_at: '2026-10-12T08:00:00Z' }));
  it('applies to any account, even if game answers cannot be read', () => {
    expect(progressionModulesEleve(path, () => true, null, undefined, 'fixture-old', rows))
      .toMatchObject({ total: 2, termines: 2, restants: [] });
  });
  it('does not exempt an incomplete path, even with module 8 previously done', () => {
    expect(jeuxLyonDispensesParHistorique(path, rows.slice(1)).size).toBe(0);
  });
  it.each(['2026-10-13T10:41:00Z', '2026-10-14T08:00:00Z', '', 'invalid'])('rejects unproven or late completion %s', date => {
    expect(jeuxLyonDispensesParHistorique(path, [rows[0], { ...rows[1], completed_at: date }]).size).toBe(0);
  });
  it('100 percent in progress and legacy undated states do not prove completion', () => {
    for (const status of ['in_progress', null]) {
      expect(jeuxLyonDispensesParHistorique(path, [rows[0], { ...rows[1], status }]).size).toBe(0);
    }
  });
  it('ignores attendance archives only for eligibility, not the displayed denominator', () => {
    expect(progressionModulesEleve([...path, { id: 83, nom: 'Archives' }], id => id !== 83, new Set(), undefined, 'fixture-old', rows))
      .toMatchObject({ total: 3, termines: 2, restants: [{ id: 83 }] });
  });
  it('does not exempt TAXI or empty paths', () => {
    expect(jeuxLyonDispensesParHistorique([{ id: 6 }], [{ ...rows[0], module_id: 6 }]).size).toBe(0);
    expect(jeuxLyonDispensesParHistorique([], rows).size).toBe(0);
  });
  it('recomputes on account change without keeping a previous exemption', () => {
    expect(progressionModulesEleve(path, () => true, new Set(), undefined, 'old', rows)).toMatchObject({ termines: 2 });
    expect(progressionModulesEleve(path, () => true, new Set(), undefined, 'new', [])).toMatchObject({ termines: 1 });
  });
  it('supports proven child module completions and does not mutate evidence', () => {
    const children = [14,15,16,17,18,19,25].map(module_id => ({ ...rows[0], module_id }));
    const proof = [...children, rows[1]];
    const before = JSON.stringify(proof);
    expect(jeuxLyonDispensesParHistorique([{ id: 2 }, { id: 8 }], proof).size).toBe(2);
    expect(JSON.stringify(proof)).toBe(before);
  });
});