import { beforeEach, describe, expect, it, vi } from 'vitest';
import { modulesAttribuesDashboard, resolveFormationId, FORMATION_DEFAULT_MODULES } from '@/lib/parcoursModulesDashboard';
import { ACTIVITES_CODE } from '@/lib/jeuxPedagogiques';
import { chargerCandidatModules } from '@/hooks/useCandidatModules';

const fake = vi.hoisted(() => ({ rows: {} as Record<string, any>, calls: [] as string[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  fake.calls.push(table);
  const q: any = {};
  for (const method of ['select', 'eq', 'order', 'in']) q[method] = () => q;
  q.single = async () => fake.rows[table];
  q.range = async (from: number, to: number) => ({ ...fake.rows[table], data: fake.rows[table]?.data?.slice(from, to + 1) });
  return q;
} } }));

beforeEach(() => {
  fake.calls = [];
  fake.rows = {
    apprenants: { data: { type_apprenant: 'vtc-e', modules_autorises: [8], formation_choisie: null } },
    apprenant_module_completion: { data: [{ module_id: 8, status: 'completed' }] },
    reponses_apprenants: { data: [] },
  };
});

describe('Candidats : même parcours et preuves que l’élève, lecture simulée', () => {
  it('dispense individuelle compte dix validations sans écrire de réponses', async () => {
    fake.rows.apprenants.data = { type_apprenant: 'va-e', modules_autorises: null };
    fake.rows.apprenant_module_completion.data = [33,41,3,29,30,38,63,73,8,53].map(module_id => ({ module_id, status: 'completed' }));
    expect(await chargerCandidatModules('bf12b32a-f8a2-434c-b855-f6033de38c2f')).toMatchObject({ total: 10, termines: 10, restants: [] });
    // Module 8 « completed » sans date : acquis conservé (règle 15/10), seul l'émargement 83 reste.
    expect(await chargerCandidatModules('fictif')).toMatchObject({ total: 11, termines: 10 });
    expect(fake.rows.reponses_apprenants.data).toEqual([]);
  });
  it.each(['vtc-elearning', 'taxi-elearning', 'taxi-pour-vtc-elearning', 'vtc-pour-taxi'] as const)('conserve les modules par défaut %s', formation => {
    expect(modulesAttribuesDashboard(formation, null).map(m => m.id)).toEqual(FORMATION_DEFAULT_MODULES[formation]);
  });
  it('regroupe les matières et ne compte pas deux fois le parent', () => {
    const formation = resolveFormationId('vtc-e', null, [2, 2, 25, 14]);
    expect(formation).not.toBeNull();
    if (!formation) return;
    expect(modulesAttribuesDashboard(formation, [2, 2, 25, 14]).map(m => m.id)).toEqual([2]);
  });
  it('validation pratique VTC après l\'ajout des jeux : jeux non faits => module restant', async () => {
    fake.rows.apprenant_module_completion.data = [{ module_id: 8, status: 'completed', completed_at: '2026-10-13T12:00:00Z' }];
    expect(await chargerCandidatModules('fictif')).toMatchObject({ total: 1, termines: 0, restants: [{ id: 8, raison: 'nouvelles_activites' }] });
    fake.rows.reponses_apprenants.data = ACTIVITES_CODE.filter(a => a.moduleId === 8).map(a => ({ exercice_id: a.id, completed: true }));
    expect(await chargerCandidatModules('fictif')).toMatchObject({ total: 1, termines: 1, restants: [] });
  });
  it('TAXI : pas de jeux VTC requis', async () => {
    fake.rows.apprenants.data = { type_apprenant: 'taxi-e', modules_autorises: [6] };
    fake.rows.apprenant_module_completion.data = [{ module_id: 6, status: 'completed' }];
    expect(await chargerCandidatModules('fictif')).toMatchObject({ total: 1, termines: 1 });
  });
  it('100 % in_progress ne constitue pas une validation', async () => {
    fake.rows.apprenant_module_completion.data = [{ module_id: 8, status: 'in_progress', progress: 100 }];
    expect(await chargerCandidatModules('fictif')).toMatchObject({ termines: 0 });
  });
  it('lecture refusée ne devient pas zéro', async () => {
    fake.rows.reponses_apprenants = { error: new Error('Refus simulé') };
    await expect(chargerCandidatModules('fictif')).rejects.toThrow('Refus simulé');
  });
});