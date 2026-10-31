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

/** An individually unlocked exam may open its genuinely unsubmitted subjects.
 * Submitted subjects keep their original attempt identities and are never replayed.
 */
export function matieresRestantesAvecDerogation(
  matieres: readonly { id: string }[],
  submittedSubjectIds: readonly string[],
  permissions: readonly number[],
  examModuleId: number,
): string[] | null {
  if (!permissions.includes(examModuleId) || submittedSubjectIds.length === 0) return null;
  const submitted = new Set(submittedSubjectIds);
  const remaining = matieres.filter(m => !submitted.has(m.id)).map(m => m.id);
  return remaining.length ? remaining : null;
}