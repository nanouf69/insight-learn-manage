import { describe, expect, it, vi } from 'vitest';
import { appendAssignedModules, assignmentTargets, assignModules, type AssignmentRecord, type AssignmentPort } from '@/components/sessions/moduleAssignment';

const recipients = [{ id: 'a', nom: 'Alpha', prenom: 'Test' }, { id: 'b', nom: 'Beta', prenom: 'Test' }];
const record: AssignmentRecord = { id: 'a', auth_user_id: 'owner', modules_autorises: [10, 7, 10, 999], type_apprenant: 'taxi', formation_choisie: 'taxi', updated_at: 'version-1', deleted_at: null, compte_cours_archive_at: null };
function port(initial = record): AssignmentPort {
  let saved = structuredClone(initial);
  return { read: vi.fn(async () => structuredClone(saved)), isProtected: vi.fn(async () => false), write: vi.fn(async (_before, modules) => { saved = { ...saved, modules_autorises: modules }; }) };
}
describe('Ajout de modules dans une session', () => {
  it('toute la session reçoit les modules indépendamment de la sélection', () => {
    expect(assignmentTargets([...recipients, recipients[0]], 'all', new Set(['a'])).map(r => r.id)).toEqual(['a', 'b']);
  });
  it('seules les personnes concernées sont ciblées', () => {
    expect(assignmentTargets(recipients, 'selected', new Set(['b', 'outside-session'])).map(r => r.id)).toEqual(['b']);
  });
  it('ajoute plusieurs modules sans retirer ni réordonner les anciens', () => {
    expect(appendAssignedModules(record, [7, 64, 83, 64])).toEqual([10, 7, 10, 999, 64, 83]);
  });
  it('préserve le parcours implicite si aucun tableau enregistré', () => {
    expect(appendAssignedModules({ ...record, modules_autorises: null, type_apprenant: 'continue-vtc', formation_choisie: 'continue-vtc' }, [70])).toEqual([81, 5, 87, 83, 85, 88, 89, 70]);
  });
  it('confirme une attribution seulement après relecture', async () => {
    const p = port();
    expect((await assignModules(p, [recipients[0]], [64, 83]))[0].status).toBe('added');
    expect((await p.read('a')).modules_autorises).toEqual([10, 7, 10, 999, 64, 83]);
  });
  it('ne réécrit pas les modules déjà présents', async () => {
    const p = port();
    expect((await assignModules(p, [recipients[0]], [7]))[0].status).toBe('unchanged');
    expect(p.write).not.toHaveBeenCalled();
  });
  it('ne crée pas de compte et ne déclenche pas les accès automatiques', async () => {
    const p = port({ ...record, auth_user_id: null });
    expect((await assignModules(p, [recipients[0]], [64]))[0].status).toBe('refused');
    expect(p.write).not.toHaveBeenCalled();
  });
  it('protège EDOF validé et refuse une lecture incertaine', async () => {
    for (const check of [async () => true, async () => { throw new Error('offline'); }]) {
      const p = port(); p.isProtected = check;
      expect((await assignModules(p, [recipients[0]], [64]))[0].status).toBe('refused');
      expect(p.write).not.toHaveBeenCalled();
    }
  });
  it('ne prétend pas réussir en cas de conflit ou de relecture différente', async () => {
    for (const write of [async () => { throw new Error('conflict'); }, async () => {}]) {
      const p = port(); p.write = write;
      expect((await assignModules(p, [recipients[0]], [64]))[0].status).toBe('refused');
    }
  });
  it('conserve le détail des réussites partielles sans annuler un ajout confirmé', async () => {
    const p = port(); const read = p.read;
    p.read = async id => { if (id === 'b') throw new Error('refus'); return read(id); };
    expect((await assignModules(p, recipients, [64])).map(r => r.status)).toEqual(['added', 'refused']);
    expect((await p.read('a')).modules_autorises).toContain(64);
  });
});