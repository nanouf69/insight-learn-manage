-- Références seulement : aucune source, note, admission ou conformité modifiée.
-- onboarding_session_id est une identité de navigateur, PAS une session CRM.
WITH base AS (
 SELECT p.*,p.remarque_interne::jsonb meta FROM qualiopi_preuves p
 WHERE (p.ref_key LIKE 'q9i-%' OR p.ref_key LIKE 'qctrl-%')
 AND EXISTS(SELECT 1 FROM qualiopi_preuve_liens l WHERE l.preuve_id=p.id AND l.indicateur IN(9,10,11))
), conv AS (
 SELECT b.id,jsonb_build_object('inscription_id',sa.id,'session_id',sa.session_id,'apprenant_id',sa.apprenant_id,
 'debut',coalesce(sa.date_debut,s.date_debut),'fin',coalesce(sa.date_fin_personnalisee,sa.date_fin,s.date_fin),
 'email_id',e.id,'envoye_le',e.sent_at,'methode','identité destinataire + date de formation dans contenu + inscription exacte') contexte
 FROM base b JOIN emails e ON e.id::text=b.source_id
 CROSS JOIN LATERAL jsonb_array_elements(b.meta->'inscriptions_candidates') j
 JOIN session_apprenants sa ON sa.id::text=j->>'inscription_id' AND sa.apprenant_id::text=j->>'apprenant_id' AND sa.session_id::text=j->>'session_id'
 JOIN sessions s ON s.id=sa.session_id
 WHERE jsonb_array_length(b.meta->'inscriptions_candidates')=1 AND e.type='sent' AND e.sent_at<=now()
 AND coalesce(sa.date_debut,s.date_debut)::text=j->>'debut'
 AND coalesce(sa.date_fin_personnalisee,sa.date_fin,s.date_fin)::text=j->>'fin'
 AND (e.apprenant_id=sa.apprenant_id OR (e.apprenant_id IS NULL AND
 (SELECT count(*) FROM apprenants a WHERE a.deleted_at IS NULL AND lower(trim(a.email))=ANY(SELECT lower(trim(r)) FROM unnest(e.recipients)r))=1
 AND EXISTS(SELECT 1 FROM apprenants a WHERE a.id=sa.apprenant_id AND lower(trim(a.email))=ANY(SELECT lower(trim(r)) FROM unnest(e.recipients)r))))
), quiz AS (
 SELECT b.id,r.apprenant_id,r.user_id,r.exercice_id,r.submitted_at,a.auth_user_id,a.modules_autorises,
 a.date_debut_cours_en_ligne debut,a.date_fin_cours_en_ligne fin,
 substring(r.exercice_id FROM '^module_([0-9]+)_')::int module_id,
 a.formation_choisie,
 coalesce(r.user_id=a.auth_user_id AND substring(r.exercice_id FROM '^module_([0-9]+)_')::int=ANY(a.modules_autorises)
 AND (r.submitted_at AT TIME ZONE 'Europe/Paris')::date BETWEEN a.date_debut_cours_en_ligne AND a.date_fin_cours_en_ligne
 AND r.status='submitted' AND r.completed AND r.submitted_at<=now() AND jsonb_typeof(r.reponses)='object' AND r.reponses<>'{}'::jsonb,false) suivi_verifie
 FROM base b JOIN reponses_apprenants r ON r.id::text=b.source_id JOIN apprenants a ON a.id=r.apprenant_id
 WHERE b.source_table='reponses_apprenants' AND a.deleted_at IS NULL
 AND NOT EXISTS(SELECT 1 FROM comptes_test_techniques t WHERE t.apprenant_id=a.id)
), dossiers AS (
 SELECT b.id,d.apprenant_id,'formulaire : identité source explicite, aucune session enregistrée' nature,
 jsonb_build_object('document_id',d.id,'type_document',d.type_document,'session_id',NULL,
 'engagements_dates_archivees',CASE WHEN d.donnees ? 'engagements_elearning' THEN jsonb_build_object(
 'debut',d.donnees->'engagements_elearning'->>'date_debut_acces','fin',d.donnees->'engagements_elearning'->>'date_fin_acces',
 'avertissement','snapshot historique conservé ; différent des dates CRM actuelles, aucune substitution') ELSE NULL END) detail
 FROM base b JOIN apprenant_documents_completes d ON d.id::text=b.source_id WHERE b.source_table='apprenant_documents_completes'
 UNION ALL
 SELECT b.id,coalesce(e.apprenant_id,(SELECT min(a.id::text)::uuid FROM apprenants a WHERE a.deleted_at IS NULL
 AND lower(trim(a.email))=ANY(SELECT lower(trim(r)) FROM unnest(e.recipients)r) HAVING count(*)=1)),
 'email : identité source ou destinataire unique ; envoi ne prouve pas réception',
 jsonb_build_object('email_id',e.id,'envoye_le',e.sent_at,'piece_jointe_signalee',e.has_attachments,
 'archive_outlook_identifiee',e.outlook_message_id IS NOT NULL,'reception_confirmee',EXISTS(
 SELECT 1 FROM email_confirmations_reception c WHERE c.accuse_id=e.email_accuse_id AND c.confirmed_at IS NOT NULL))
 FROM base b JOIN emails e ON e.id::text=b.source_id WHERE b.source_table='emails'
 UNION ALL
 SELECT id,apprenant_id,'quiz : identité dossier explicite ; session pédagogique non enregistrée',
 jsonb_build_object('exercice_id',exercice_id,'module_id',module_id,'remis_le',submitted_at,
 'suivi_verifie',suivi_verifie,'attribution_source','apprenants.modules_autorises','fenetre_acces_crm',jsonb_build_object('debut',debut,'fin',fin),
 'modalite',CASE WHEN formation_choisie~*'(learning|ligne)' AND formation_choisie!~*'(soir|journ|présentiel|presentiel)' THEN 'e-learning explicite au dossier' ELSE 'modalité non attribuée par ce contrôle' END,
 'limite','fenêtre CRM actuelle et attribution actuelle, pas version historique ; aucune session déduite des dates ni acquisition certifiée') FROM quiz
), candidats AS (
 SELECT b.id,jsonb_build_object('controle_le','2026-11-18T20:08:00Z','apprenant_id',d.apprenant_id,'portee',d.nature,
 'source',d.detail,'session_verifiee',c.contexte,'session_non_attribuee',c.contexte IS NULL,
 'limite','référence documentaire uniquement ; aucune conformité, aucun changement source') annotation
 FROM base b JOIN dossiers d ON d.id=b.id JOIN apprenants a ON a.id=d.apprenant_id LEFT JOIN conv c ON c.id=b.id
 WHERE a.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM comptes_test_techniques t WHERE t.apprenant_id=a.id)
), annotations AS (
 UPDATE qualiopi_preuves p SET remarque_interne=(b.meta||jsonb_build_object('rapprochement_20261118_2008',c.annotation))::text
 FROM base b JOIN candidats c ON c.id=b.id WHERE p.id=b.id AND NOT b.meta ? 'rapprochement_20261118_2008'
 RETURNING p.id
), nouveaux_liens AS (
 INSERT INTO qualiopi_preuve_liens(preuve_id,indicateur,justification)
 SELECT q.id,10,'Suivi individuel vérifié : remise serveur du même compte, module attribué et date dans la fenêtre d’accès CRM. Référence au dossier, sans session présentielle inventée. Pas preuve d’adaptation mise en œuvre ni de réussite ; notes inchangées.'
 FROM quiz q WHERE q.suivi_verifie AND NOT EXISTS(SELECT 1 FROM qualiopi_preuve_liens l WHERE l.preuve_id=q.id AND l.indicateur=10)
 RETURNING id
)
SELECT (SELECT count(*) FROM annotations) annotations_ajoutees,(SELECT count(*) FROM nouveaux_liens) liens_10_ajoutes,
 (SELECT count(*) FROM conv) sessions_verifiees,(SELECT count(*) FROM candidats) dossiers_rapproches;