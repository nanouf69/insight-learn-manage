import { describe, expect, it } from 'vitest';
import { assemblerCalculJalons } from '@/lib/jalonsCalculCore';
import { activitesDispenseesPourParcours } from '@/lib/exceptionsModulesEleve';
import { progressionModulesEleve } from '@/lib/progressionModulesEleve';
import { modulesDuCalcul } from '@/lib/jalonsPedagogiques';

const beneficiary = 'bf12b32a-f8a2-434c-b855-f6033de38c2f';
const bah = '4c75ae96-9d4d-4c6f-8097-dd59d27fe9f5';
const fixture = (id: string, oldComplete: boolean, waive = true, valideLe = oldComplete ? '2026-10-12T08:00:00Z' : '2026-10-14T08:00:00Z') => {
  const { filiere, parcours, parcoursInitial } = modulesDuCalcul('va-e');
  const completions = parcoursInitial.map(module_id => ({ module_id, status: oldComplete || module_id !== 3 ? 'completed' : 'in_progress', progress: 50, completed_at: valideLe }));
  return assemblerCalculJalons({ key: 'va-e', filiere, parcours, parcoursInitial, editorRows: [],
    examens: Array.from({ length: 6 }, (_, i) => ({ type: 'VA', numero: i + 1, matieres: [{ questions: [{ id: i }] }] })),
    initialDe: () => ({ cours: [], exercices: [] }), pratiqueDetails: [], emargements: [], completions,
    heuresValidees: [{ id: 'fictive', heures: 6, created_at: '2026-10-12', categorie: 'pratique' }], jeuxTermines: [],
    activitesDispensees: waive ? [...activitesDispenseesPourParcours(parcoursInitial.map(id => ({ id })), completions, id)] : [],
  });
};

describe('CRM and current weighted milestones use the same Lyon dispensation', () => {
  it('individual exception removes units and requirements, never fabricates game completions', () => {
    const r = fixture(beneficiary, true);
    expect(r.activites).toEqual([]);
    expect(r.volumes[8].jeux ?? 0).toBe(0);
    expect(r.resultat.taux).toBe(100);
  });
  it('past complete fictitious path also has no game requirement', () => {
    expect(fixture('fixture-old', true).activites).toEqual([]);
  });
  it('incomplete unrelated path still requires the games', () => {
    expect(fixture('fixture-active', false).activites[0].requises).toHaveLength(2);
  });
  it('Bah waiver does not validate other modules or force all-done', () => {
    expect(fixture(bah, false).activites).toEqual([]);
    const r = progressionModulesEleve([{ id: 5, nom: 'Bilan' }, { id: 8, nom: 'Pratique' }], id => id === 8, new Set(), undefined, bah);
    expect(r).toMatchObject({ total: 2, termines: 1, restants: [{ id: 5, raison: 'module' }] });
  });
  it('existing frozen method input is unchanged unless waivers explicitly supplied', () => {
    expect(fixture(beneficiary, true, false, '2026-10-14T08:00:00Z').activites[0].requises).toHaveLength(2);
  });
  it('no exception leaks between accounts', () => {
    fixture(beneficiary, true);
    expect(fixture('fixture-active', false).activites[0].requises).toHaveLength(2);
  });
});