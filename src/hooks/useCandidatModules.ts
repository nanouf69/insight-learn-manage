import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { progressionModulesEleve } from '@/lib/progressionModulesEleve';
import { resolveFormationId, modulesExigesDashboard, normalizeModuleIdForDashboard, DASHBOARD_PARENT_TO_CHILDREN } from '@/lib/parcoursModulesDashboard';
import { computeServerCompletedModuleIds, type CompletionLite } from '@/lib/moduleUnlockLogic';
import { ACTIVITES_CODE } from '@/lib/jeuxPedagogiques';
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows';
import { chargerEtatCompletionServeur } from '@/lib/etatCompletionServeur';
import { chargerQuizServeurModules, chargerReponsesQuizOrigine, projeterProgressionConfirmee } from '@/lib/moduleProgressionReadModel';
import { etatServeurQuizModule, listesQuizModule, type ListesQuiz } from '@/lib/quizStatutListes';
import { MODULES_QUESTIONS_FACULTATIVES } from '@/lib/moduleCompletionEvidence';

/** Modules dont les quiz ne sont pas exigés un par un (facultatifs, Bilans examen 5/11, examens blancs). */
const horsListesQuiz = (id: number) => MODULES_QUESTIONS_FACULTATIVES.has(id) || id === 5 || id === 11 || (id >= 35 && id <= 38);

/**
 * Listes nominatives des quiz pour les modules restants (lecture seule) : contenu serveur + remises d'origine
 * du compte. Toute erreur de lecture = « non vérifiable » pour ces modules, jamais « confirmé ».
 */
export async function chargerListesQuizRestants(apprenantId: string, moduleIds: readonly number[]): Promise<Record<number, ListesQuiz>> {
  const ids = moduleIds.filter((id) => !horsListesQuiz(id));
  const res: Record<number, ListesQuiz> = {};
  if (!ids.length) return res;
  let quiz: Awaited<ReturnType<typeof chargerQuizServeurModules>> | null = null;
  let lignes: Awaited<ReturnType<typeof chargerReponsesQuizOrigine>> | null = null;
  try {
    [quiz, lignes] = await Promise.all([chargerQuizServeurModules(ids), chargerReponsesQuizOrigine(apprenantId)]);
  } catch (e) {
    console.error('[CRM] quiz des modules restants illisibles', e);
  }
  for (const id of ids) {
    if (!quiz || !lignes) { res[id] = { lisible: false, confirmes: [], enAttente: [] }; continue; }
    const requis = quiz.get(id) ?? [];
    if (!requis.length) continue;
    res[id] = listesQuizModule({
      requis: requis.map((q) => ({ id: q.id, label: q.label })),
      serveur: etatServeurQuizModule(lignes, id, apprenantId, new Map(requis.map((q) => [q.id, q.questionIds]))),
    });
  }
  return res;
}

export const CANDIDAT_MODULES_KEY = 'candidat-modules-confirmes';

/** Read only: assigned learner modules, terminal states and confirmed code activities. */
export async function chargerCandidatModules(apprenantId: string) {
  const { data: apprenant, error } = await supabase.from('apprenants')
    .select('modules_autorises, type_apprenant, formation_choisie, date_fin_cours_en_ligne').eq('id', apprenantId).single();
  if (error) throw error;
  if (!apprenant) throw new Error('Parcours indisponible');
  const formation = resolveFormationId(apprenant.type_apprenant, apprenant.formation_choisie, apprenant.modules_autorises);
  if (!formation) throw new Error('Parcours non déterminé');
  const [recordedCompletions, activites, etatsServeur] = await Promise.all([
    fetchAllRows<CompletionLite>((from, to) => supabase.from('apprenant_module_completion')
      .select('module_id, status, completed_at, details').eq('apprenant_id', apprenantId).order('module_id').range(from, to)),
    fetchAllRows<{ exercice_id: string; completed: boolean | null }>((from, to) => supabase.from('reponses_apprenants')
      .select('exercice_id, completed').eq('apprenant_id', apprenantId)
      .in('exercice_id', ACTIVITES_CODE.map(a => a.id)).order('exercice_id').range(from, to)),
    // Verdict serveur unique (preuves soumises comprises) : même source que l'élève et les jalons.
    chargerEtatCompletionServeur(apprenantId),
  ]);
  // Même vérification stricte que CoursPublic : lecture absente/périmée = erreur,
  // jamais un repli sur des détails incomplets ou un ancien drapeau completed.
  const completions = projeterProgressionConfirmee(recordedCompletions, apprenantId, etatsServeur, []);
  const done = computeServerCompletedModuleIds(completions, DASHBOARD_PARENT_TO_CHILDREN, normalizeModuleIdForDashboard);
  const progression = progressionModulesEleve(modulesExigesDashboard(formation, apprenant.modules_autorises, completions, (apprenant as any).date_fin_cours_en_ligne), id => done.has(id),
    new Set(activites.filter(a => a.completed === true).map(a => String(a.exercice_id))), undefined, apprenantId, completions);
  return progression;
}

/** Fiche CRM seulement (jamais dans les listes) : quiz nominatifs des modules restants, relus à chaque changement. */
export function useListesQuizRestants(apprenantId: string | undefined, moduleIds: readonly number[] | null) {
  const { user } = useAuth();
  const cle = moduleIds ? [...moduleIds].sort((a, b) => a - b).join(',') : null;
  return useQuery({
    queryKey: ['crm-quiz-modules-restants', user?.id, apprenantId, cle],
    enabled: !!user?.id && !!apprenantId && cle !== null,
    staleTime: 0, gcTime: 0, refetchOnWindowFocus: true,
    queryFn: () => chargerListesQuizRestants(apprenantId!, moduleIds ?? []),
  });
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apprenants', filter: `id=eq.${apprenantId}` }, invalidate)
      // (Re)connexion Realtime : des événements ont pu être manqués pendant la coupure → relecture.
      .subscribe((status) => { if (status === 'SUBSCRIBED') invalidate(); });
    const onOnline = () => invalidate();
    window.addEventListener('online', onOnline);
    return () => { window.removeEventListener('online', onOnline); void supabase.removeChannel(channel); };
  }, [userId, apprenantId, qc]);
  const query = useQuery({
    queryKey: [CANDIDAT_MODULES_KEY, userId, apprenantId], enabled: !!userId && !!apprenantId,
    staleTime: 0, gcTime: 0, refetchOnWindowFocus: true, refetchOnReconnect: true,
    queryFn: () => {
      if (!apprenantId || !userId) throw new Error('Compte absent');
      return chargerCandidatModules(apprenantId);
    },
  });
  return { ...query, data: userId && apprenantId ? query.data : undefined, isLoading: loading || query.isLoading };
}