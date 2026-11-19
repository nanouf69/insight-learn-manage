-- Lecture uniquement : périmètre explicite, contrôle du corps, identité destinataire et absence d'échec connu.
WITH actifs AS (
 SELECT a.* FROM public.apprenants a WHERE a.deleted_at IS NULL
 AND NOT EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=a.id)
 AND (coalesce(a.nom,'')||' '||coalesce(a.prenom,'')) !~* '\m(test|demo|debug)\M'
), corps AS (
 SELECT e.*,lower(translate(regexp_replace(coalesce(nullif(e.body_html,''),e.body_preview,''),'<[^>]*>',' ','g'),'éèêëàâäôöûüùîïç','eeeeaaaoouuuiic')) texte,
 coalesce(e.apprenant_id,(SELECT min(a.id::text)::uuid FROM actifs a
 WHERE lower(trim(a.email))=ANY(SELECT lower(trim(r)) FROM unnest(e.recipients)r) HAVING count(*)=1)) aid
 FROM public.emails e WHERE e.type='sent' AND e.sent_at<=TIMESTAMPTZ '2026-11-19 12:18:00+00'
 AND (e.subject ~* 'convocation' OR e.subject ~* '(inscription obligatoire.*examen|réinscription.*T3P|reinscription.*T3P|photo.*manquante.*examen)')
), qualifies AS (
 SELECT c.*,a.formation_choisie,a.type_apprenant,a.date_examen_theorique,a.date_examen_pratique,
 a.date_debut_cours_en_ligne,a.date_fin_cours_en_ligne,
 CASE WHEN subject ~* 'convocation' THEN 'convocation' WHEN subject ~* 'photo' THEN 'pièce demandée'
 WHEN subject ~* '(réinscription|reinscription)' THEN 'réinscription examen' ELSE 'inscription examen' END famille,
 texte ~ '(chambre des metiers|\mcma\M)' mention_cma,
 texte ~ 'exament3p' portail_inscription,
 texte ~ '(piece d.identite|photo d.identite|permis de conduire|documents.*(depos|apport|transm))' pieces,
 texte ~ '(reussite.*examen theorique|inscription.*valid|non.presentation)' conditions,
 texte ~ '(\{\{|a completer|date a definir)' valeurs_non_resolues,
 EXISTS(SELECT 1 FROM email_accuses ac WHERE ac.id=c.email_accuse_id AND ac.failed_at IS NOT NULL) echec,
 EXISTS(SELECT 1 FROM email_accuses ac WHERE ac.id=c.email_accuse_id AND ac.delivered_at IS NOT NULL AND ac.failed_at IS NULL) remis_provider,
 EXISTS(SELECT 1 FROM email_confirmations_reception cr WHERE cr.accuse_id=c.email_accuse_id AND cr.confirmed_at IS NOT NULL) reception_confirmee,
 lower(trim(a.email))=ANY(SELECT lower(trim(r)) FROM unnest(c.recipients)r) destinataire_verifie
 FROM corps c LEFT JOIN actifs a ON a.id=c.aid
 WHERE texte ~ '(examen theorique|examen pratique|exament3p|chambre des metiers)'
 AND texte !~ 'attestation de formation continue'
), historiques AS (
 SELECT p.source_id email_id,j->>'inscription_id' inscription_id,j->>'session_id' session_id,j->>'apprenant_id' apprenant_id
 FROM qualiopi_preuves p
 CROSS JOIN LATERAL (SELECT p.remarque_interne::jsonb->'rapprochement_20261118_2008'->'session_verifiee' j) x
 WHERE p.source_table='emails' AND p.remarque_interne LIKE '%rapprochement_20261118_2008%'
), correspondances AS (
 SELECT q.id email_id,sa.id inscription_id,s.id session_id,sa.apprenant_id,
 coalesce(sa.date_debut,s.date_debut) debut,coalesce(sa.date_fin_personnalisee,sa.date_fin,s.date_fin) fin,s.type_session
 FROM qualifies q JOIN session_apprenants sa ON sa.apprenant_id=q.aid AND NOT coalesce(sa.liste_attente,false)
 JOIN sessions s ON s.id=sa.session_id
 LEFT JOIN historiques h ON h.email_id=q.id::text AND h.inscription_id=sa.id::text AND h.session_id=s.id::text AND h.apprenant_id=q.aid::text
 WHERE q.destinataire_verifie AND NOT q.echec AND NOT q.valeurs_non_resolues
 AND (h.inscription_id IS NOT NULL OR (s.type_session='examen' AND
 (q.texte LIKE '%'||to_char(s.date_debut,'DD/MM/YYYY')||'%' OR q.texte LIKE '%'||s.date_debut::text||'%'
 OR q.texte LIKE '%'||extract(day FROM s.date_debut)::int||' '||(ARRAY['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'])[extract(month FROM s.date_debut)::int]||' '||extract(year FROM s.date_debut)::int||'%')))
), groupes AS (
 SELECT email_id,jsonb_agg(jsonb_build_object('inscription_id',inscription_id,'session_id',session_id,
 'apprenant_id',apprenant_id,'debut',debut,'fin',fin,'type_session',type_session) ORDER BY inscription_id) sessions_candidates
 FROM correspondances GROUP BY email_id
), candidats AS (
 SELECT q.*,g.sessions_candidates,CASE WHEN jsonb_array_length(g.sessions_candidates)=1 THEN g.sessions_candidates->0 ELSE NULL END session_verifiee
 FROM qualifies q LEFT JOIN groupes g ON g.email_id=q.id
 WHERE q.destinataire_verifie AND NOT q.echec AND NOT q.valeurs_non_resolues
)

, sources AS (
 SELECT c.*,jsonb_build_object('audit','qualiopi16-20261119','email_id',c.id,'apprenant_id',c.aid,'envoye_le',c.sent_at,
 'formation_dossier',c.formation_choisie,'famille',c.famille,'corps_md5',md5(coalesce(nullif(c.body_html,''),c.body_preview,'')),
 'contenu_verifie',jsonb_build_object('CMA',c.mention_cma,'portail_inscription',c.portail_inscription,'pieces',c.pieces,'conditions',c.conditions),
 'session_verifiee',c.session_verifiee,'sessions_candidates',c.sessions_candidates,
 'date_examen_theorique_crm',c.date_examen_theorique,'date_examen_pratique_crm',c.date_examen_pratique,
 'fenetre_acces_crm',jsonb_build_object('debut',c.date_debut_cours_en_ligne,'fin',c.date_fin_cours_en_ligne),
 'remis_provider',c.remis_provider,'reception_confirmee',c.reception_confirmee,'archive_outlook_identifiee',c.outlook_message_id IS NOT NULL,
 'piece_jointe_signalee',c.has_attachments,
 'limite','Envoi enregistré, non preuve de réception ni de respect complet des conditions CMA. Aucun modèle actuel attribué à un envoi historique. Dates CRM actuelles ne prouvent pas la session historique. Plusieurs sessions compatibles restent candidates, aucune choisie.') meta
 FROM candidats c
), nouvelles AS (
 INSERT INTO qualiopi_preuves(ref_key,titre,description,ce_que_demontre,emplacement,source_type,source_table,source_id,source_libelle,date_preuve,remarque_interne,fichiers)
 SELECT 'q16-20261119-email-'||s.id,'Certification — '||s.famille||' — envoi daté vérifié',
 'Contenu réel enregistré et destinataire du dossier vérifiés ; pas simple objet ni modèle présumé envoyé.',
 'Information examen : '||concat_ws(', ',CASE WHEN s.mention_cma THEN 'CMA' END,CASE WHEN s.portail_inscription THEN 'portail Examen T3P / inscription' END,
 CASE WHEN s.pieces THEN 'documents à déposer ou transmettre' END,CASE WHEN s.conditions THEN 'conditions mentionnées' END)||'. Envoi seulement ; aucune inscription validée ou admissibilité certifiée par cet audit.',
 'CRM / Mails / emails / '||s.id,'reference','emails',s.id::text,'Audit contenu convocation/certification — 19/11/2026',
 (s.sent_at AT TIME ZONE 'Europe/Paris')::date,s.meta::text,'[]'::jsonb
 FROM sources s WHERE NOT EXISTS(SELECT 1 FROM qualiopi_preuves p WHERE p.source_table='emails' AND p.source_id=s.id::text)
 ON CONFLICT(ref_key) WHERE ref_key IS NOT NULL DO NOTHING RETURNING id,source_id
), references_sources AS (
 SELECT n.id,n.source_id FROM nouvelles n UNION ALL
 SELECT p.id,p.source_id FROM qualiopi_preuves p JOIN sources s ON p.source_table='emails' AND p.source_id=s.id::text
), liens AS (
 INSERT INTO qualiopi_preuve_liens(preuve_id,indicateur,justification)
 SELECT r.id,16,'Contenu réel et envoi vérifiés. Contexte : '||s.meta::text FROM references_sources r JOIN sources s ON s.id::text=r.source_id
 WHERE NOT EXISTS(SELECT 1 FROM qualiopi_preuve_liens l WHERE l.preuve_id=r.id AND l.indicateur=16)
 ON CONFLICT(preuve_id,indicateur) DO NOTHING RETURNING id
)
SELECT (SELECT count(*) FROM nouvelles) nouvelles_fiches,(SELECT count(*) FROM liens) nouveaux_liens,
 (SELECT count(*) FROM sources) envois_verifies;
