import { supabase } from '@/integrations/supabase/client';
import type { ModuleLite, UnlockComputationResult } from '@/lib/moduleUnlockLogic';

/** Server-owned access permission, deliberately independent from completion evidence. */
export async function lireDerogationsModules(apprenantId: string): Promise<number[]> {
  const { data, error } = await supabase.from('module_acces_derogations')
    .select('module_id').eq('apprenant_id', apprenantId);
  if (error) throw error;
  return (data ?? []).map(row => Number(row.module_id));
}

export function appliquerDerogationsModules(
  state: UnlockComputationResult,
  assignedModules: readonly ModuleLite[],
  permissions: readonly number[],
): void {
  const granted = new Set(permissions);
  for (const module of assignedModules) {
    if (granted.has(module.id)) state.unlockedModuleIds.add(module.id);
  }
}