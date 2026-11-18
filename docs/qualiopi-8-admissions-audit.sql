-- Read-only audit. Dates belong to the exact enrollment, not the current CRM label.
WITH inscriptions AS (
 SELECT sa.id inscription_id,sa.apprenant_id,sa.session_id,a.nom,a.prenom,
 s.nom session_nom,s.type_session,s.types_apprenant,a.type_apprenant,a.formation_choisie,
 greatest(s.date_debut,sa.date_debut) debut,
 least(s.date_fin,coalesce(sa.date_fin_personnalisee,sa.date_fin)) fin,
 s.date_debut session_debut,s.date_fin session_fin,
 sa.date_debut inscription_debut,sa.date_fin inscription_fin,sa.date_fin_personnalisee,
 a.statut dossier_statut,sa.statut_suivi inscription_statut,
 (a.deleted_at IS NOT NULL OR a.abandonnee IS TRUE OR sa.liste_attente IS TRUE
 OR sa.emargements_exclus IS TRUE
 OR concat_ws(' ',s.statut,sa.statut_suivi) ~* 'annul|abandon|exclu|attente') bloque,
 (EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=a.id)
 OR EXISTS(SELECT 1 FROM public.core_bridge_comptes_test t WHERE t.apprenant_id=a.id)
 OR concat_ws(' ',a.nom,a.prenom) ~* '(^|[\s_-])(test|demo|démo|technique)([\s_-]|$)'
 OR a.email ~* '(example\.(com|org)|@test\.|^test[+._-])') compte_test
 FROM public.session_apprenants sa
 JOIN public.sessions s ON s.id=sa.session_id
 JOIN public.apprenants a ON a.id=sa.apprenant_id
 WHERE s.type_session IN ('theorique','pratique','pratique_taxi','pratique_vtc')
), preuves AS (
 SELECT i.inscription_id,'emargements_fc' source_table,e.id source_id,e.date_emargement date_participation,e.signed_at trace_le
 FROM inscriptions i JOIN public.emargements_fc e ON e.apprenant_id=i.apprenant_id
 AND e.date_emargement BETWEEN i.debut AND i.fin
 WHERE e.signed_at IS NOT NULL AND e.signed_at<=now()
 AND e.signature_data_url LIKE 'data:image/%' AND e.absent IS NOT TRUE AND e.masque IS FALSE
 -- A learner/date-only signature is not assigned to two enrollments.
 AND 1=(SELECT count(*) FROM inscriptions x WHERE x.apprenant_id=i.apprenant_id
 AND e.date_emargement BETWEEN x.debut AND x.fin AND NOT x.bloque AND NOT x.compte_test)
 UNION ALL
 SELECT i.inscription_id,'fc_signatures_papier',p.id,p.date_presence,p.created_at
 FROM inscriptions i JOIN public.fc_signatures_papier p ON p.inscription_id=i.inscription_id
 AND p.apprenant_id=i.apprenant_id AND p.session_id=i.session_id
 JOIN public.documents_inscription d ON d.id=p.document_id AND d.apprenant_id=i.apprenant_id
 WHERE p.date_presence BETWEEN i.debut AND i.fin AND p.heures>0
 AND nullif(d.url,'') IS NOT NULL AND coalesce(d.statut,'') !~* 'refus|rejet'
 UNION ALL
 SELECT i.inscription_id,'presentiel_presence_creneaux',p.id,p.date_presence,p.created_at
 FROM inscriptions i JOIN public.presentiel_presence_creneaux p ON p.inscription_id=i.inscription_id
 AND p.apprenant_id=i.apprenant_id AND p.session_id=i.session_id
 JOIN public.presentiel_heures_validees v ON v.id=p.validation_id AND v.apprenant_id=i.apprenant_id
 WHERE p.date_presence BETWEEN i.debut AND i.fin AND p.minutes>0
 AND nullif(p.pdf_chemin,'') IS NOT NULL
 AND coalesce((SELECT d.action FROM public.presentiel_validation_decisions d
 WHERE d.validation_id=p.validation_id ORDER BY d.version DESC LIMIT 1),'valider')<>'annuler'
), agregat AS (
 SELECT inscription_id,count(*) nb_preuves,min(date_participation) premiere_participation,
 max(date_participation) derniere_participation,
 jsonb_agg(jsonb_build_object('table',source_table,'id',source_id,'date_participation',date_participation,'trace_le',trace_le)
 ORDER BY date_participation,source_table,source_id) preuves
 FROM preuves WHERE date_participation<=(now() AT TIME ZONE 'Europe/Paris')::date
 AND trace_le<=now() GROUP BY inscription_id
)
SELECT i.*,coalesce(p.nb_preuves,0) nb_preuves,p.premiere_participation,p.derniere_participation,
 coalesce(p.preuves,'[]'::jsonb) preuves,
 -- Recording/attendance timestamps are not historical admission decision timestamps.
 NULL::timestamptz decision_le,'date à confirmer' date_decision_statut,
 CASE WHEN i.compte_test THEN 'compte test exclu'
 WHEN i.bloque THEN 'dossier/inscription exclu ou interrompu — revue individuelle'
 WHEN i.debut IS NULL OR i.fin IS NULL OR i.fin<i.debut THEN 'dates absentes ou incohérentes'
 WHEN i.debut>(now() AT TIME ZONE 'Europe/Paris')::date THEN 'session future'
 WHEN coalesce(p.nb_preuves,0)>0 THEN 'eligible'
 ELSE 'participation non rattachée avec certitude — émargements, preuves pédagogiques ou archives à vérifier'
 END resultat
FROM inscriptions i LEFT JOIN agregat p ON p.inscription_id=i.inscription_id