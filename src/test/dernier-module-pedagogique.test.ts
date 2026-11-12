import { expect,it } from 'vitest';
import { dernierModulePedagogique, moduleDepuisClePedagogique } from '@/lib/dernierModulePedagogique';
it('dernière activité datée, pas ordre ni achèvement ; terminés également éligibles',()=>{
 expect(dernierModulePedagogique([{moduleId:4,at:'2026-11-12T15:00:00Z',id:'a'},{moduleId:2,at:'2026-11-12T17:00:00Z',id:'b'}],[4,2,3])).toBe(2);
});
it('sans horodatage fiable, hors parcours ou égalité ambiguë : aucun contour',()=>{
 expect(dernierModulePedagogique([{moduleId:2,at:'',id:'a'}],[2])).toBeNull();
 expect(dernierModulePedagogique([{moduleId:4,at:'2026-11-12',id:'a'}],[2])).toBeNull();
 expect(dernierModulePedagogique([{moduleId:2,at:'2026-11-12',id:'a'},{moduleId:4,at:'2026-11-12',id:'b'}],[2,4])).toBeNull();
});
it('identité exercice stable uniquement, aucun rapprochement par titre ou nom',()=>{
 expect(moduleDepuisClePedagogique('module_5_revision_exo_505')).toBe(5);
 expect(moduleDepuisClePedagogique('Sécurité routière')).toBeNull();
});