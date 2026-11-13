-- Définition exacte relevée le 13/11/2026 16:05 UTC (md5 du pg_get_functiondef : 23509f3cb8c55b13f13b16bf488483cb)
CREATE OR REPLACE FUNCTION public.releve_sources_apprenant(_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'completions', coalesce((SELECT jsonb_agg(jsonb_build_object('module_id', module_id, 'status', status, 'progress', progress, 'completed_at', completed_at) ORDER BY module_id) FROM public.apprenant_module_completion WHERE apprenant_id = _id), '[]'::jsonb),
    'emargements', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'date_emargement', date_emargement, 'demi_journee', demi_journee, 'absent', absent, 'masque', masque, 'signed_at', signed_at,
        'signature_data_url', CASE WHEN btrim(coalesce(signature_data_url,'')) <> '' THEN 'signee' END) ORDER BY date_emargement, demi_journee, id) FROM public.emargements_fc WHERE apprenant_id = _id), '[]'::jsonb),
    'heures_validees', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'heures', heures, 'created_at', created_at, 'date_presence', date_presence, 'categorie', categorie, 'motif', motif) ORDER BY created_at) FROM public.presentiel_heures_validees WHERE apprenant_id = _id), '[]'::jsonb),
    'reservations_pratique', coalesce((SELECT jsonb_agg(jsonb_build_object('date_choisie', date_choisie, 'type_formation', type_formation, 'creneau', creneau) ORDER BY date_choisie) FROM public.reservations_pratique WHERE apprenant_id = _id), '[]'::jsonb),
    'sessions', coalesce((SELECT jsonb_agg(jsonb_build_object('heure_debut_personnalisee', sa.heure_debut_personnalisee, 'heure_fin_personnalisee', sa.heure_fin_personnalisee,
        'sessions', jsonb_build_object('type_session', s.type_session, 'nom', s.nom, 'date_debut', s.date_debut, 'date_fin', s.date_fin, 'heure_debut', s.heure_debut, 'heure_fin', s.heure_fin, 'statut', s.statut)) ORDER BY s.date_debut)
        FROM public.session_apprenants sa JOIN public.sessions s ON s.id = sa.session_id WHERE sa.apprenant_id = _id), '[]'::jsonb),
    'planning_configs', coalesce((SELECT jsonb_agg(jsonb_build_object('planning_start_date', c.planning_start_date, 'planning_end_date', c.planning_end_date, 'day_time_slots', c.day_time_slots, 'updated_at', c.updated_at) ORDER BY c.updated_at DESC)
        FROM public.planning_pratique_config c WHERE EXISTS (SELECT 1 FROM public.reservations_pratique r WHERE r.apprenant_id = _id AND r.date_choisie BETWEEN c.planning_start_date AND c.planning_end_date)
           OR EXISTS (SELECT 1 FROM public.session_apprenants sa JOIN public.sessions s ON s.id = sa.session_id WHERE sa.apprenant_id = _id AND s.date_debut BETWEEN c.planning_start_date AND c.planning_end_date)), '[]'::jsonb),
    'activites', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'module_id', module_id, 'module_nom', module_nom, 'action_type', action_type, 'occurred_at', occurred_at) ORDER BY occurred_at, id) FROM public.apprenant_module_activites WHERE apprenant_id = _id), '[]'::jsonb),
    'reponses', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'exercice_id', exercice_id, 'reponses', reponses, 'completed', completed, 'status', status, 'tentative', tentative, 'submitted_at', submitted_at, 'updated_at', updated_at) ORDER BY id) FROM public.reponses_apprenants WHERE apprenant_id = _id), '[]'::jsonb),
    'quiz', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'quiz_type', quiz_type, 'quiz_id', quiz_id, 'matiere_id', matiere_id, 'note_sur_20', note_sur_20, 'completed_at', completed_at) ORDER BY id) FROM public.apprenant_quiz_results WHERE apprenant_id = _id), '[]'::jsonb),
    'tentatives_v2', coalesce((SELECT jsonb_agg(jsonb_build_object('attempt_id', attempt_id, 'exam_id', exam_id, 'etat', etat, 'is_test', is_test, 'started_at', started_at, 'finished_at', finished_at, 'snapshot_fingerprint', snapshot_fingerprint) ORDER BY attempt_id) FROM public.exam_attempts_v2 WHERE apprenant_id = _id), '[]'::jsonb),
    'connexions', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'started_at', started_at, 'ended_at', ended_at, 'last_seen_at', last_seen_at, 'last_action_at', last_action_at) ORDER BY id) FROM public.apprenant_connexions WHERE apprenant_id = _id), '[]'::jsonb),
    'gele_le', now()
  )
$function$;
