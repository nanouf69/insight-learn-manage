import { describe, expect, it } from 'vitest';
import { progressionModulesEleve } from '@/lib/progressionModulesEleve';
import { exceptionModulesEleve } from '@/lib/exceptionsModulesEleve';
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