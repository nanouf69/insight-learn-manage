import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { progressionModulesEleve } from '@/lib/progressionModulesEleve';
import { resolveFormationId, modulesAttribuesDashboard, normalizeModuleIdForDashboard, DASHBOARD_PARENT_TO_CHILDREN } from '@/lib/parcoursModulesDashboard';
import { computeServerCompletedModuleIds, type CompletionLite } from '@/lib/moduleUnlockLogic';
import { ACTIVITES_CODE } from '@/lib/jeuxPedagogiques';
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows';

export const CANDIDAT_MODULES_KEY = 'candidat-modules-confirmes';

/** Read only: assigned learner modules, terminal states and confirmed code activities. */
export async function chargerCandidatModules(apprenantId: string) {
  const { data: apprenant, error } = await supabase.from('apprenants')
    .select('modules_autorises, type_apprenant, formation_choisie').eq('id', apprenantId).single();
  if (error) throw error;
  if (!apprenant) throw new Error('Parcours indisponible');
  const formation = resolveFormationId(apprenant.type_apprenant, apprenant.formation_choisie, apprenant.modules_autorises);
  if (!formation) throw new Error('Parcours non déterminé');
  const [completions, activites] = await Promise.all([
    fetchAllRows<CompletionLite>((from, to) => supabase.from('apprenant_module_completion')
      .select('module_id, status, completed_at').eq('apprenant_id', apprenantId).order('module_id').range(from, to)),
    fetchAllRows<{ exercice_id: string; completed: boolean | null }>((from, to) => supabase.from('reponses_apprenants')
      .select('exercice_id, completed').eq('apprenant_id', apprenantId)
      .in('exercice_id', ACTIVITES_CODE.map(a => a.id)).order('exercice_id').range(from, to)),
  ]);
  const done = computeServerCompletedModuleIds(completions, DASHBOARD_PARENT_TO_CHILDREN, normalizeModuleIdForDashboard);
  return progressionModulesEleve(modulesAttribuesDashboard(formation, apprenant.modules_autorises), id => done.has(id),
    new Set(activites.filter(a => a.completed === true).map(a => String(a.exercice_id))), undefined, apprenantId, completions);
}

export function useCandidatModules(apprenantId?: string) {
  const { user, loading } = useAuth();
  const userId = !loading ? user?.id : undefined;
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId || !apprenantId) return;
    const invalidate = () => { void qc.invalidateQueries({ queryKey: [CANDIDAT_MODULES_KEY, userId, apprenantId] }); };
    const channel = supabase.channel(`candidat-modules-${userId}-${apprenantId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apprenant_module_completion', filter: `apprenant_id=eq.${apprenantId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reponses_apprenants', filter: `apprenant_id=eq.${apprenantId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apprenants', filter: `id=eq.${apprenantId}` }, invalidate).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, apprenantId, qc]);
  const query = useQuery({
    queryKey: [CANDIDAT_MODULES_KEY, userId, apprenantId], enabled: !!userId && !!apprenantId,
    staleTime: 0, gcTime: 0, refetchOnWindowFocus: true,
    queryFn: () => {
      if (!apprenantId || !userId) throw new Error('Compte absent');
      return chargerCandidatModules(apprenantId);
    },
  });
  return { ...query, data: userId && apprenantId ? query.data : undefined, isLoading: loading || query.isLoading };
}