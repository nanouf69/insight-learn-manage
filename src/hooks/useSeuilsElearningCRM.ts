import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows';
import { elearningHoursEvidence } from '@/lib/elearningHoursEvidence';
import { requiredElearningHours } from '@/lib/elearningRequiredHours';
import { seuilElearning, type SeuilElearning } from '@/lib/seuilElearning';
import { calculerPratiqueSlotDetails, daySlotsDepuisConfigs } from '@/lib/pratiqueSlots';

const SIZE = 80;
const tables = ['apprenants', 'apprenant_module_activites', 'apprenant_quiz_results', 'reponses_apprenants', 'apprenant_connexions', 'reservations_pratique', 'session_apprenants', 'planning_pratique_config'] as const;

/** Read-only chunked evidence: never a complete hours hook/subscription per CRM row. */
export async function chargerSeuilsElearningCRM(ids: string[]): Promise<Record<string, SeuilElearning>> {
  const result: Record<string, SeuilElearning> = {};
  const configs = await fetchAllRows<any>((f,t) => supabase.from('planning_pratique_config').select('id,day_time_slots,updated_at').order('id').range(f,t));
  for (let start = 0; start < ids.length; start += SIZE) {
    const chunk = ids.slice(start, start + SIZE);
    try {
      const [learners, acts, quizzes, exos, cnx, reservations, sessions] = await Promise.all([
        fetchAllRows<any>((f,t) => supabase.from('apprenants').select('id,type_apprenant,formation_choisie,heures_elearning,heures_totales,heures_presentiel,date_fin_formation,date_fin_cours_en_ligne').in('id',chunk).order('id').range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from('apprenant_module_activites').select('id,apprenant_id,module_nom,action_type,occurred_at').in('apprenant_id',chunk).order('id').range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from('apprenant_quiz_results').select('id,apprenant_id,completed_at').in('apprenant_id',chunk).order('id').range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from('reponses_apprenants').select('id,apprenant_id,updated_at').eq('completed',true).in('apprenant_id',chunk).order('id').range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from('apprenant_connexions').select('id,apprenant_id,started_at,ended_at,last_seen_at,last_action_at,current_module').in('apprenant_id',chunk).order('id').range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from('reservations_pratique').select('id,apprenant_id,date_choisie,type_formation,creneau').in('apprenant_id',chunk).order('id').range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from('session_apprenants').select('id,apprenant_id,liste_attente,emargements_exclus,heure_debut_personnalisee,heure_fin_personnalisee,sessions:session_id(type_session,nom,date_debut,date_fin,heure_debut,heure_fin,statut)').in('apprenant_id',chunk).order('id').range(f,t)),
      ]);
      const group = (rows: any[]) => {
        const map = new Map<string, any[]>();
        for (const row of rows) { const list = map.get(row.apprenant_id) ?? []; list.push(row); map.set(row.apprenant_id, list); }
        return map;
      };
      const groups = [acts,quizzes,exos,cnx,reservations,sessions].map(group);
      const learnerMap = new Map(learners.map(r => [r.id,r]));
      for (const id of chunk) {
        const learner = learnerMap.get(id);
        if (!learner) { result[id] = { etat: 'indisponible' }; continue; }
        const [a,q,e,c,r,s] = groups.map(g => g.get(id) ?? []);
        const excluded = new Set(s.filter(row => (row.liste_attente === true || row.emargements_exclus === true) && /pratique/i.test(row.sessions?.type_session ?? '')).map(row => String(row.sessions?.date_debut ?? '').slice(0,10)));
        const selectedSessions = s.filter(row => row.liste_attente !== true && row.emargements_exclus !== true);
        const selectedReservations = r.filter(row => !excluded.has(String(row.date_choisie ?? '').slice(0,10)));
        const dates = [...selectedReservations.map(row => row.date_choisie), ...selectedSessions.map(row => row.sessions?.date_debut)];
        const pratique = calculerPratiqueSlotDetails(selectedReservations,selectedSessions,daySlotsDepuisConfigs(dates,configs));
        const evidence = elearningHoursEvidence({ apprenantId:id, apprenant:learner, acts:a,quizzes:q,exos:e,cnxAll:c,pratiqueDates:pratique.map(row => row.date) });
        result[id] = seuilElearning(learner,evidence.onlineMin / 60,requiredElearningHours(learner));
      }
    } catch {
      for (const id of chunk) result[id] = { etat: 'indisponible' };
    }
  }
  return result;
}

export function useSeuilsElearningCRM(rows: any[], enabled: boolean) {
  const { user } = useAuth();
  const client = useQueryClient();
  const ids = useMemo(() => rows.filter(row => seuilElearning(row).etat === 'indisponible').map(row => row.id).sort(), [rows]);
  const query = useQuery({ queryKey:['seuils-elearning-crm',user?.id,ids], enabled:enabled && !!user?.id && ids.length > 0, queryFn:() => chargerSeuilsElearningCRM(ids), staleTime:30_000 });
  useEffect(() => {
    if (!enabled || !user?.id) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel(`seuils-crm-${crypto.randomUUID()}`);
    for (const table of tables) channel.on('postgres_changes',{event:'*',schema:'public',table},() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void client.invalidateQueries({queryKey:['seuils-elearning-crm',user.id]}); },300);
    });
    channel.subscribe();
    return () => { if (timer) clearTimeout(timer); void supabase.removeChannel(channel); };
  },[enabled,user?.id,client]);
  return { ...query, data:query.isError ? {} : query.data ?? {}, loading:enabled && ids.length > 0 && (!user?.id || query.isLoading || query.isFetching) };
}