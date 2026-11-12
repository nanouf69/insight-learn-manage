import { supabase } from '@/integrations/supabase/client';
import { normalizeModuleIdForDashboard } from './parcoursModulesDashboard';
export type EvenementModule = { moduleId: number; at: string; id: string };
/** Ambiguous timestamps across modules never select an arbitrary card. */
export function dernierModulePedagogique(events: EvenementModule[], attribues: number[]): number | null {
  const allowed = new Set(attribues);
  const valid = events.map(e => ({ ...e, moduleId: normalizeModuleIdForDashboard(e.moduleId) }))
    .filter(e => allowed.has(e.moduleId) && Number.isFinite(Date.parse(e.at)));
  if (!valid.length) return null;
  const max = Math.max(...valid.map(e => Date.parse(e.at)));
  const ids = new Set(valid.filter(e => Date.parse(e.at) === max).map(e => e.moduleId));
  return ids.size === 1 ? [...ids][0] : null;
}
export function moduleDepuisClePedagogique(key: unknown): number | null {
  if (typeof key !== 'string') return null;
  const m = /^module_(\d+)_(?:revision_)?(?:exo|inline)_\d+/.exec(key);
  return m ? Number(m[1]) : null;
}
const nonVide = (v: unknown): boolean => typeof v === 'string' ? !!v.trim() : Array.isArray(v) ? v.some(nonVide) : !!v && typeof v === 'object' ? Object.entries(v).some(([k,x]) => !k.startsWith('__') && nonVide(x)) : typeof v === 'number' || typeof v === 'boolean';
/** Read-only owner-scoped events; no connexion/current_module or completed-module fallback. */
export async function chargerDernierModulePedagogique(owner: string, ids: number[]): Promise<number | null> {
  const events: EvenementModule[] = [];
  const tables = ['apprenant_module_activites', 'reponses_apprenants', 'apprenant_quiz_results'] as const;
  for (const table of tables) {
    let foundAt: string | null = null;
    for (let offset = 0; ; offset += 100) {
      const column = table === 'apprenant_module_activites' ? 'occurred_at' : table === 'reponses_apprenants' ? 'updated_at' : 'completed_at';
      const select = table === 'apprenant_module_activites' ? 'id,module_id,action_type,occurred_at' : table === 'reponses_apprenants' ? 'id,exercice_id,reponses,updated_at' : 'id,quiz_id,completed_at';
      // Dynamic read projection only: avoid the generated union's recursive type expansion.
      let q = (supabase.from(table) as any).select(select).eq('apprenant_id',owner).not(column,'is',null);
      if (table === 'apprenant_module_activites') q = q.in('action_type',['open_module','open_cours']);
      const { data, error } = await q.order(column,{ascending:false}).order('id').range(offset,offset+99);
      if (error) throw new Error('Dernière activité pédagogique indisponible');
      for (const r of (data ?? []) as any[]) {
        if (foundAt && Date.parse(r[column]) < Date.parse(foundAt)) break;
        const id = table === 'apprenant_module_activites' ? Number(r.module_id) : moduleDepuisClePedagogique(r.exercice_id ?? r.quiz_id);
        if (id == null || !ids.includes(normalizeModuleIdForDashboard(id)) || (table === 'reponses_apprenants' && !nonVide(r.reponses)) || !Number.isFinite(Date.parse(r[column]))) continue;
        events.push({ moduleId:id,at:r[column],id:r.id });foundAt=r[column];
      }
      if (!data?.length || data.length < 100 || (foundAt && Date.parse((data as any[]).at(-1)?.[column]) < Date.parse(foundAt))) break;
    }
  }
  return dernierModulePedagogique(events,ids);
}
export const contourModulePedagogique = (dernier: boolean) => dernier ? 'border-[3px] border-primary' : 'border border-border';