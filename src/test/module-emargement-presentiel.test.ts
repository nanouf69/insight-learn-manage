import { describe, expect, it } from 'vitest';
import { moduleEmargementPresentiel } from '@/lib/moduleEmargementPresentiel';
import { modulesAttribuesDashboard } from '@/lib/parcoursModulesDashboard';

describe('Accès émargements pour chaque parcours présentiel', () => {
  it.each(['vtc', 'vtc-cours-du-soir', 'vtc-pour-taxi', 'continue-vtc'] as const)('%s ouvre les feuilles VTC', formation => {
    expect(moduleEmargementPresentiel(formation)?.id).toBe(83);
  });
  it.each(['taxi', 'taxi-pour-vtc', 'continue-taxi', 'mobilite-taxi'] as const)('%s ouvre les feuilles TAXI', formation => {
    expect(moduleEmargementPresentiel(formation)?.id).toBe(84);
  });
  it.each(['vtc-elearning', 'taxi-elearning', 'taxi-pour-vtc-elearning'] as const)('%s sans émargement présentiel automatique', formation => {
    expect(moduleEmargementPresentiel(formation)).toBeNull();
  });
  it('accès indépendant des anciens modules sans ajouter de jalon', () => {
    const ids = [1, 2];
    expect(moduleEmargementPresentiel('vtc')?.id).toBe(83);
    expect(modulesAttribuesDashboard('vtc', ids).map(m => m.id)).toEqual([1, 2]);
    expect(ids).toEqual([1, 2]);
  });
});